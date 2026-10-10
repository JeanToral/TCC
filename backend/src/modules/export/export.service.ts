// ─────────────────────── Imports ────────────────────────
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import {
  Priority,
  WorkOrderStatus,
  WorkOrderType,
} from '../../generated/prisma';

import { hasPermission } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { composeCostBreakdown } from '../work-order-costs/work-order-costs.service';
import type {
  WorkOrderExportFilter,
  WorkOrderExportRow,
} from '../work-orders/work-orders.repository';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import {
  type ColumnDefinition,
  EXPORT_BATCH_SIZE,
  EXPORT_ROW_LIMIT,
  type ExportFilterDescription,
  type ExportFormat,
  type ExportMetadata,
} from './column-definition';
import { writeCsv } from './csv-writer';
import { writeXlsx } from './xlsx-writer';

// ─────────────────────── Rótulos pt-BR ──────────────────
const STATUS_LABEL: Record<WorkOrderStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
};

const PRIORITY_LABEL: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
};

const TYPE_LABEL: Record<WorkOrderType, string> = {
  CORRECTIVE: 'Corretiva',
  PREVENTIVE: 'Preventiva',
};

const CONTENT_TYPE: Record<ExportFormat, string> = {
  csv: 'text/csv; charset=utf-8',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

// ─────────────────────── Colunas: Ordens de Serviço ─────
/** Tempo de parada em horas: relógio de parede, não horas trabalhadas. */
function downtimeHours(row: WorkOrderExportRow): number | null {
  if (!row.startedAt || !row.completedAt) return null;
  return (row.completedAt.getTime() - row.startedAt.getTime()) / 3_600_000;
}

function costOf(row: WorkOrderExportRow) {
  return composeCostBreakdown({
    laborHours: row.laborHours,
    laborRateSnapshot: row.laborRateSnapshot,
    costIsComplete: row.costIsComplete,
    parts: row.parts,
    externalAmounts: row.externalCosts.map((c) => c.amount),
  });
}

function coverageLabel(row: WorkOrderExportRow): string {
  if (row.status !== WorkOrderStatus.COMPLETED) return 'Em aberto';
  return row.costIsComplete ? 'Completa' : 'Incompleta';
}

const WORK_ORDER_COLUMNS: readonly ColumnDefinition<WorkOrderExportRow>[] = [
  { key: 'id', label: 'Nº', type: 'integer', width: 8, value: (r) => r.id },
  {
    key: 'title',
    label: 'Título',
    type: 'text',
    width: 40,
    value: (r) => r.title,
  },
  {
    key: 'assetTag',
    label: 'Ativo (tag)',
    type: 'text',
    width: 12,
    value: (r) => r.asset.tag,
  },
  {
    key: 'assetName',
    label: 'Ativo',
    type: 'text',
    width: 26,
    value: (r) => r.asset.name,
  },
  {
    key: 'type',
    label: 'Tipo',
    type: 'text',
    width: 12,
    value: (r) => TYPE_LABEL[r.type],
  },
  {
    key: 'priority',
    label: 'Prioridade',
    type: 'text',
    width: 11,
    value: (r) => PRIORITY_LABEL[r.priority],
  },
  {
    key: 'status',
    label: 'Status',
    type: 'text',
    width: 14,
    value: (r) => STATUS_LABEL[r.status],
  },
  {
    key: 'requestedBy',
    label: 'Solicitante',
    type: 'text',
    width: 22,
    value: (r) => r.requestedBy.name,
  },
  {
    key: 'assignedTo',
    label: 'Responsável',
    type: 'text',
    width: 22,
    value: (r) => r.assignedTo?.name ?? null,
  },
  {
    key: 'createdAt',
    label: 'Aberta em',
    type: 'datetime',
    value: (r) => r.createdAt,
  },
  {
    key: 'startedAt',
    label: 'Iniciada em',
    type: 'datetime',
    value: (r) => r.startedAt,
  },
  {
    key: 'completedAt',
    label: 'Concluída em',
    type: 'datetime',
    value: (r) => r.completedAt,
  },
  {
    key: 'downtime',
    label: 'Tempo de parada (h)',
    type: 'number',
    width: 14,
    value: downtimeHours,
  },
  {
    key: 'laborHours',
    label: 'Horas apontadas',
    type: 'number',
    width: 12,
    value: (r) => r.laborHours,
  },
];

/** Só entram com cost.read. Sem a permissão, as colunas nem existem no arquivo. */
const WORK_ORDER_COST_COLUMNS: readonly ColumnDefinition<WorkOrderExportRow>[] =
  [
    {
      key: 'partsCost',
      label: 'Custo peças',
      type: 'currency',
      value: (r) => costOf(r).partsCost,
    },
    {
      key: 'laborCost',
      label: 'Custo mão de obra',
      type: 'currency',
      value: (r) => costOf(r).laborCost,
    },
    {
      key: 'externalCost',
      label: 'Custo externo',
      type: 'currency',
      value: (r) => costOf(r).externalCost,
    },
    {
      key: 'totalCost',
      label: 'Custo total',
      type: 'currency',
      value: (r) => costOf(r).total,
    },
    {
      key: 'coverage',
      label: 'Cobertura de custo',
      type: 'text',
      width: 14,
      value: coverageLabel,
    },
  ];

export function workOrderColumns(
  includeCost: boolean,
): readonly ColumnDefinition<WorkOrderExportRow>[] {
  return includeCost
    ? [...WORK_ORDER_COLUMNS, ...WORK_ORDER_COST_COLUMNS]
    : WORK_ORDER_COLUMNS;
}

// ─────────────────────── Helpers ────────────────────────
function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** `ordens-de-servico_2025-01-01_2025-12-31.xlsx` ou datado pela geração. */
export function buildFilename(
  base: string,
  format: ExportFormat,
  generatedAt: Date,
  from?: Date,
  to?: Date,
): string {
  const period =
    from || to
      ? `${from ? isoDay(from) : 'inicio'}_${to ? isoDay(to) : 'hoje'}`
      : isoDay(generatedAt);
  return `${base}_${period}.${format}`;
}

function describeWorkOrderFilter(
  filter: WorkOrderExportFilter,
): ExportFilterDescription[] {
  const out: ExportFilterDescription[] = [];
  if (filter.status)
    out.push({ label: 'Status', value: STATUS_LABEL[filter.status] });
  if (filter.assetId)
    out.push({ label: 'Ativo (id)', value: String(filter.assetId) });
  if (filter.assignedToId)
    out.push({ label: 'Responsável (id)', value: String(filter.assignedToId) });
  if (filter.from)
    out.push({ label: 'Aberta a partir de', value: isoDay(filter.from) });
  if (filter.to) out.push({ label: 'Aberta até', value: isoDay(filter.to) });
  if (out.length === 0)
    out.push({ label: 'Filtros', value: 'Nenhum — todas as OS' });
  return out;
}

// ─────────────────────── Service ────────────────────────
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(private readonly workOrders: WorkOrdersService) {}

  /**
   * O teto é verificado ANTES de qualquer byte ser enviado: depois que o
   * streaming começa não dá mais para responder com status de erro.
   */
  assertWithinLimit(total: number): void {
    if (total > EXPORT_ROW_LIMIT) {
      throw new BadRequestException(
        `A exportação teria ${total.toLocaleString('pt-BR')} linhas. ` +
          `Refine o período ou os filtros — o limite é de ` +
          `${EXPORT_ROW_LIMIT.toLocaleString('pt-BR')} linhas.`,
      );
    }
  }

  async exportWorkOrders(
    format: ExportFormat,
    filter: WorkOrderExportFilter,
    viewer: JwtUser,
    res: Response,
  ): Promise<void> {
    const total = await this.workOrders.countForExport(filter);
    this.assertWithinLimit(total);

    const includeCost = hasPermission(viewer.permissions, 'cost.read');
    const generatedAt = new Date();

    const meta: ExportMetadata = {
      title: 'Ordens de Serviço',
      generatedAt,
      generatedBy: viewer.email,
      filters: describeWorkOrderFilter(filter),
      notes: includeCost
        ? [
            'Custos de OS concluídas usam valores congelados na conclusão.',
            'OS abertas aparecem com custo parcial — cobertura "Em aberto".',
          ]
        : undefined,
    };

    const filename = buildFilename(
      'ordens-de-servico',
      format,
      generatedAt,
      filter.from,
      filter.to,
    );
    const rows = this.workOrders.iterateForExport(filter, EXPORT_BATCH_SIZE);

    await this.stream(res, format, filename, (out) =>
      format === 'csv'
        ? writeCsv(out, workOrderColumns(includeCost), rows)
        : writeXlsx(out, workOrderColumns(includeCost), rows, meta),
    );
  }

  private async stream(
    res: Response,
    format: ExportFormat,
    filename: string,
    write: (out: Response) => Promise<number>,
  ): Promise<void> {
    res.status(200);
    res.setHeader('Content-Type', CONTENT_TYPE[format]);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Cache-Control', 'no-store');

    try {
      const count = await write(res);
      // O ExcelJS encerra o stream no commit; o CSV não.
      if (!res.writableEnded) res.end();
      this.logger.log(`Exportação ${filename}: ${count} linhas`);
    } catch (err) {
      // Cabeçalhos já enviados: derruba a conexão para o download falhar em vez
      // de entregar um arquivo truncado que parece válido.
      this.logger.error(`Falha ao exportar ${filename}`, err as Error);
      res.destroy(err as Error);
    }
  }
}
