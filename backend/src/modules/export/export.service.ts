// ─────────────────────── Imports ────────────────────────
import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import {
  Priority,
  WorkOrderStatus,
  WorkOrderType,
} from '../../generated/prisma';

import { resolvePeriod } from '../../common/reporting/month-buckets';
import { hasPermission } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import {
  type AssetKpiRecord,
  DashboardService,
  type SlaBreachRecord,
  type StockReportRecord,
} from '../dashboard/dashboard.service';
import type { DashboardFilterInput } from '../dashboard/dto/dashboard-filter.input';
import type { FinanceFilterInput } from '../finance/dto/finance-filter.input';
import {
  type AssetCostRecord,
  FinanceService,
} from '../finance/finance.service';
import type {
  SparePartExportFilter,
  SparePartRecord,
} from '../spare-parts/spare-parts.repository';
import { SparePartsService } from '../spare-parts/spare-parts.service';
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
  SAO_PAULO_TZ,
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

// ─────────────────────── Colunas: Custos por ativo ──────
export function assetCostColumns(
  period: string,
): readonly ColumnDefinition<AssetCostRecord>[] {
  return [
    {
      key: 'assetTag',
      label: 'Ativo (tag)',
      type: 'text',
      width: 12,
      value: (r) => r.assetTag,
    },
    {
      key: 'assetName',
      label: 'Ativo',
      type: 'text',
      width: 26,
      value: (r) => r.assetName,
    },
    {
      key: 'period',
      label: 'Período',
      type: 'text',
      width: 26,
      value: () => period,
    },
    {
      key: 'partsCost',
      label: 'Custo peças',
      type: 'currency',
      value: (r) => r.realizedPartsCost,
    },
    {
      key: 'laborCost',
      label: 'Custo mão de obra',
      type: 'currency',
      value: (r) => r.realizedLaborCost,
    },
    {
      key: 'externalCost',
      label: 'Custo externo',
      type: 'currency',
      value: (r) => r.realizedExternalCost,
    },
    {
      key: 'total',
      label: 'Custo total',
      type: 'currency',
      value: (r) => r.realizedTotal,
    },
    {
      key: 'corrective',
      label: 'Corretiva',
      type: 'currency',
      value: (r) => r.realizedCorrectiveCost,
    },
    {
      key: 'preventive',
      label: 'Preventiva',
      type: 'currency',
      value: (r) => r.realizedPreventiveCost,
    },
    {
      key: 'completed',
      label: 'OS concluídas',
      type: 'integer',
      width: 13,
      value: (r) => r.completedWorkOrders,
    },
    {
      key: 'incomplete',
      label: 'OS com custo incompleto',
      type: 'integer',
      width: 20,
      value: (r) => r.workOrdersWithIncompleteCost,
    },
  ];
}

/** Linha de totais: os mesmos campos, somados. */
export function sumAssetCosts(
  records: readonly AssetCostRecord[],
): AssetCostRecord {
  const sum = (pick: (r: AssetCostRecord) => number): number =>
    records.reduce((acc, r) => acc + pick(r), 0);
  return {
    assetId: 0,
    assetTag: 'TOTAL',
    assetName: '',
    realizedPartsCost: sum((r) => r.realizedPartsCost),
    realizedLaborCost: sum((r) => r.realizedLaborCost),
    realizedExternalCost: sum((r) => r.realizedExternalCost),
    realizedTotal: sum((r) => r.realizedTotal),
    realizedCorrectiveCost: sum((r) => r.realizedCorrectiveCost),
    realizedPreventiveCost: sum((r) => r.realizedPreventiveCost),
    forecastTotal: sum((r) => r.forecastTotal),
    completedWorkOrders: sum((r) => r.completedWorkOrders),
    workOrdersWithIncompleteCost: sum((r) => r.workOrdersWithIncompleteCost),
  };
}

// ─────────────────────── Colunas: Estoque de peças ──────
/** Linha da planilha de estoque; nulos permitem a linha de totais. */
export interface SparePartExportRow {
  readonly partNumber: string;
  readonly name: string;
  readonly description: string | null;
  readonly quantity: number | null;
  readonly minimumStock: number | null;
  readonly unitCost: number | null;
  /** quantity × unitCost; nulo quando a peça não tem custo unitário. */
  readonly stockValue: number | null;
  readonly situation: string | null;
}

export function toSparePartExportRow(
  part: SparePartRecord,
): SparePartExportRow {
  return {
    partNumber: part.partNumber,
    name: part.name,
    description: part.description,
    quantity: part.quantity,
    minimumStock: part.minimumStock,
    unitCost: part.unitCost,
    stockValue: part.unitCost === null ? null : part.quantity * part.unitCost,
    situation: part.quantity < part.minimumStock ? 'Estoque baixo' : 'Normal',
  };
}

const SPARE_PART_COLUMNS: readonly ColumnDefinition<SparePartExportRow>[] = [
  {
    key: 'partNumber',
    label: 'Código',
    type: 'text',
    width: 14,
    value: (r) => r.partNumber,
  },
  { key: 'name', label: 'Peça', type: 'text', width: 30, value: (r) => r.name },
  {
    key: 'description',
    label: 'Descrição',
    type: 'text',
    width: 40,
    value: (r) => r.description,
  },
  {
    key: 'quantity',
    label: 'Quantidade',
    type: 'integer',
    width: 12,
    value: (r) => r.quantity,
  },
  {
    key: 'minimumStock',
    label: 'Estoque mínimo',
    type: 'integer',
    width: 14,
    value: (r) => r.minimumStock,
  },
];

/** Só entram com cost.read, como na exportação de OS. */
const SPARE_PART_COST_COLUMNS: readonly ColumnDefinition<SparePartExportRow>[] =
  [
    {
      key: 'unitCost',
      label: 'Custo unitário',
      type: 'currency',
      value: (r) => r.unitCost,
    },
    {
      key: 'stockValue',
      label: 'Valor em estoque',
      type: 'currency',
      value: (r) => r.stockValue,
    },
  ];

const SPARE_PART_SITUATION_COLUMN: ColumnDefinition<SparePartExportRow> = {
  key: 'situation',
  label: 'Situação',
  type: 'text',
  width: 14,
  value: (r) => r.situation,
};

export function sparePartColumns(
  includeCost: boolean,
): readonly ColumnDefinition<SparePartExportRow>[] {
  return [
    ...SPARE_PART_COLUMNS,
    ...(includeCost ? SPARE_PART_COST_COLUMNS : []),
    SPARE_PART_SITUATION_COLUMN,
  ];
}

/** Só o valor total soma: quantidades de peças diferentes não se somam. */
export function sumStockValue(
  rows: readonly SparePartExportRow[],
): SparePartExportRow {
  return {
    partNumber: 'TOTAL',
    name: '',
    description: null,
    quantity: null,
    minimumStock: null,
    unitCost: null,
    stockValue: rows.reduce((acc, r) => acc + (r.stockValue ?? 0), 0),
    situation: null,
  };
}

// ─────────────────────── Colunas: Relatórios ────────────
export const RELIABILITY_COLUMNS: readonly ColumnDefinition<AssetKpiRecord>[] = [
  { key: 'assetName', label: 'Ativo', type: 'text', width: 30, value: (r) => r.assetName },
  {
    key: 'mttr',
    label: 'MTTR (h)',
    type: 'number',
    width: 12,
    value: (r) => r.mttr,
  },
  {
    key: 'mtbf',
    label: 'MTBF (h)',
    type: 'number',
    width: 12,
    value: (r) => r.mtbf,
  },
  {
    key: 'completedWorkOrders',
    label: 'Corretivas concluídas',
    type: 'integer',
    width: 20,
    value: (r) => r.completedWorkOrders,
  },
  {
    key: 'totalWorkOrders',
    label: 'OS totais do ativo',
    type: 'integer',
    width: 18,
    value: (r) => r.totalWorkOrders,
  },
];

export const SLA_BREACH_COLUMNS: readonly ColumnDefinition<SlaBreachRecord>[] = [
  { key: 'workOrderId', label: 'Nº', type: 'integer', width: 8, value: (r) => r.workOrderId },
  { key: 'title', label: 'Título', type: 'text', width: 40, value: (r) => r.title },
  { key: 'assetTag', label: 'Ativo (tag)', type: 'text', width: 12, value: (r) => r.assetTag },
  { key: 'assetName', label: 'Ativo', type: 'text', width: 26, value: (r) => r.assetName },
  {
    key: 'priority',
    label: 'Prioridade',
    type: 'text',
    width: 12,
    value: (r) => PRIORITY_LABEL[r.priority],
  },
  { key: 'type', label: 'Tipo', type: 'text', width: 12, value: (r) => TYPE_LABEL[r.type] },
  { key: 'createdAt', label: 'Aberta em', type: 'datetime', value: (r) => r.createdAt },
  { key: 'startedAt', label: 'Iniciada em', type: 'datetime', value: (r) => r.startedAt },
  { key: 'completedAt', label: 'Concluída em', type: 'datetime', value: (r) => r.completedAt },
  {
    key: 'limitHours',
    label: 'Prazo para início (h)',
    type: 'integer',
    width: 18,
    value: (r) => r.limitHours,
  },
  {
    key: 'delayHours',
    label: 'Atraso (h)',
    type: 'number',
    width: 12,
    value: (r) => r.delayHours,
  },
];

export const STOCK_CONSUMPTION_COLUMNS: readonly ColumnDefinition<StockReportRecord>[] = [
  { key: 'partNumber', label: 'Código', type: 'text', width: 14, value: (r) => r.partNumber },
  { key: 'name', label: 'Peça', type: 'text', width: 30, value: (r) => r.name },
  { key: 'quantity', label: 'Saldo atual', type: 'integer', width: 12, value: (r) => r.quantity },
  {
    key: 'minimumStock',
    label: 'Estoque mínimo',
    type: 'integer',
    width: 14,
    value: (r) => r.minimumStock,
  },
  {
    key: 'situation',
    label: 'Situação',
    type: 'text',
    width: 14,
    value: (r) => (r.belowMinimum ? 'Abaixo do mínimo' : 'Normal'),
  },
  {
    key: 'consumed',
    label: 'Consumido no período',
    type: 'integer',
    width: 20,
    value: (r) => r.consumed,
  },
  {
    key: 'workOrders',
    label: 'OS que consumiram',
    type: 'integer',
    width: 18,
    value: (r) => r.workOrders,
  },
];

/** Filtros comuns aos relatórios, já com o período padrão resolvido. */
function describeReportFilter(
  filter: DashboardFilterInput,
  from: Date,
  to: Date,
): ExportFilterDescription[] {
  return [
    { label: 'Período', value: describePeriod(from, to) },
    ...(filter.assetId ? [{ label: 'Ativo (id)', value: String(filter.assetId) }] : []),
  ];
}

// ─────────────────────── Helpers ────────────────────────
const BR_DAY = new Intl.DateTimeFormat('pt-BR', {
  timeZone: SAO_PAULO_TZ,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
});

/** O frontend envia o período como meia-noite local — formata em Brasília. */
export function describePeriod(from?: Date, to?: Date): string {
  if (from && to) return `${BR_DAY.format(from)} a ${BR_DAY.format(to)}`;
  if (from) return `A partir de ${BR_DAY.format(from)}`;
  if (to) return `Até ${BR_DAY.format(to)}`;
  return 'Todo o histórico';
}

const ISO_DAY = new Intl.DateTimeFormat('en-CA', {
  timeZone: SAO_PAULO_TZ,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

/** `yyyy-mm-dd` no fuso de Brasília: o fim do dia 30/09 (23:59 -03) é 01/10 em UTC. */
function isoDay(date: Date): string {
  return ISO_DAY.format(date);
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

interface ExportSheet<T> {
  readonly columns: readonly ColumnDefinition<T>[];
  readonly rows: AsyncIterable<T> | Iterable<T>;
  readonly meta: ExportMetadata;
  readonly footer?: T;
}

const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
});

/** Cobertura de Custo declarada no arquivo, como na tela financeira. */
export function coverageNote(totals: AssetCostRecord): string {
  const { completedWorkOrders: done, workOrdersWithIncompleteCost: missing } =
    totals;
  if (missing === 0)
    return `Cobertura completa: ${done} OS concluídas, todas com custo calculável.`;
  return (
    `Cobertura incompleta: ${missing} de ${done} OS concluídas sem preço de ` +
    'peça ou taxa horária — o total subestima o gasto real.'
  );
}

// ─────────────────────── Service ────────────────────────
@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);

  constructor(
    private readonly workOrders: WorkOrdersService,
    private readonly finance: FinanceService,
    private readonly spareParts: SparePartsService,
    private readonly dashboard: DashboardService,
  ) {}

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

    await this.render(res, format, filename, {
      columns: workOrderColumns(includeCost),
      rows,
      meta,
    });
  }

  /**
   * Mesmos números da tela financeira: a agregação é a do FinanceService, não
   * uma segunda implementação.
   */
  async exportAssetCosts(
    format: ExportFormat,
    filter: FinanceFilterInput,
    viewer: JwtUser,
    res: Response,
  ): Promise<void> {
    const records = await this.finance.getAssetCosts(filter);
    this.assertWithinLimit(records.length);

    const totals = sumAssetCosts(records);
    const generatedAt = new Date();

    const meta: ExportMetadata = {
      title: 'Custos por Ativo',
      generatedAt,
      generatedBy: viewer.email,
      filters: [
        { label: 'Período', value: describePeriod(filter.from, filter.to) },
        ...(filter.assetId
          ? [{ label: 'Ativo (id)', value: String(filter.assetId) }]
          : []),
      ],
      notes: [
        coverageNote(totals),
        'Custo realizado: OS concluídas, com valores congelados na conclusão.',
        'Peças e mão de obra entram no período pela data de conclusão da OS; ' +
          'serviços externos, pela competência.',
        `Custo previsto de OS abertas (estimativa, fora do total): ` +
          `${BRL.format(totals.forecastTotal)}.`,
      ],
    };

    const filename = buildFilename(
      'custos-por-ativo',
      format,
      generatedAt,
      filter.from,
      filter.to,
    );

    await this.render(res, format, filename, {
      columns: assetCostColumns(describePeriod(filter.from, filter.to)),
      rows: records,
      meta,
      footer: totals,
    });
  }

  async exportSpareParts(
    format: ExportFormat,
    filter: SparePartExportFilter,
    viewer: JwtUser,
    res: Response,
  ): Promise<void> {
    const parts = await this.spareParts.findForExport(filter);
    this.assertWithinLimit(parts.length);

    const includeCost = hasPermission(viewer.permissions, 'cost.read');
    const rows = parts.map(toSparePartExportRow);
    const generatedAt = new Date();

    const filters: ExportFilterDescription[] = [];
    if (filter.search) filters.push({ label: 'Busca', value: filter.search });
    if (filter.lowStockOnly)
      filters.push({ label: 'Situação', value: 'Apenas estoque baixo' });
    if (filters.length === 0)
      filters.push({ label: 'Filtros', value: 'Nenhum — todas as peças' });

    const withoutCost = parts.filter((p) => p.unitCost === null).length;
    const meta: ExportMetadata = {
      title: 'Estoque de Peças',
      generatedAt,
      generatedBy: viewer.email,
      filters,
      notes: includeCost
        ? [
            'Valor em estoque = quantidade × custo unitário atual.',
            withoutCost > 0
              ? `${withoutCost} de ${parts.length} peças sem custo unitário — ` +
                'o valor total do estoque está subestimado.'
              : 'Cobertura completa: todas as peças têm custo unitário.',
          ]
        : undefined,
    };

    await this.render(
      res,
      format,
      buildFilename('estoque-de-pecas', format, generatedAt),
      {
        columns: sparePartColumns(includeCost),
        rows,
        meta,
        footer: includeCost ? sumStockValue(rows) : undefined,
      },
    );
  }

  /** Mesmos números da aba Confiabilidade: a agregação é a do DashboardService. */
  async exportReliability(
    format: ExportFormat,
    filter: DashboardFilterInput,
    viewer: JwtUser,
    res: Response,
  ): Promise<void> {
    const { from, to } = resolvePeriod(filter.from, filter.to);
    const rows = await this.dashboard.getKpis({ ...filter, from, to });
    this.assertWithinLimit(rows.length);
    const generatedAt = new Date();

    await this.render(res, format, buildFilename('confiabilidade', format, generatedAt, from, to), {
      columns: RELIABILITY_COLUMNS,
      rows,
      meta: {
        title: 'Confiabilidade por Ativo',
        generatedAt,
        generatedBy: viewer.email,
        filters: describeReportFilter(filter, from, to),
        notes: [
          'MTTR: média de (conclusão − início) das OS corretivas concluídas no período.',
          'MTBF: média do intervalo entre o fim de uma corretiva e o início da seguinte; ' +
            'vazio com menos de duas falhas no período.',
        ],
      },
    });
  }

  async exportSlaBreaches(
    format: ExportFormat,
    filter: DashboardFilterInput,
    viewer: JwtUser,
    res: Response,
  ): Promise<void> {
    const { from, to } = resolvePeriod(filter.from, filter.to);
    const rows = await this.dashboard.getSlaBreaches({ ...filter, from, to });
    this.assertWithinLimit(rows.length);
    const generatedAt = new Date();

    await this.render(res, format, buildFilename('sla-estourado', format, generatedAt, from, to), {
      columns: SLA_BREACH_COLUMNS,
      rows,
      meta: {
        title: 'OS fora do SLA',
        generatedAt,
        generatedBy: viewer.email,
        filters: describeReportFilter(filter, from, to),
        notes: [
          'OS concluídas no período cujo início passou do prazo da prioridade ' +
            '(Crítica 2h, Alta 8h, Média 48h, Baixa 168h).',
        ],
      },
    });
  }

  async exportStockConsumption(
    format: ExportFormat,
    filter: DashboardFilterInput,
    viewer: JwtUser,
    res: Response,
  ): Promise<void> {
    const { from, to } = resolvePeriod(filter.from, filter.to);
    const rows = await this.dashboard.getStockReport({ ...filter, from, to });
    this.assertWithinLimit(rows.length);
    const generatedAt = new Date();

    await this.render(res, format, buildFilename('consumo-de-pecas', format, generatedAt, from, to), {
      columns: STOCK_CONSUMPTION_COLUMNS,
      rows,
      meta: {
        title: 'Estoque e Consumo de Peças',
        generatedAt,
        generatedBy: viewer.email,
        filters: describeReportFilter(filter, from, to),
        notes: [
          'Saldo e situação são de agora; o consumo é das OS concluídas no período.',
          'Peças abaixo do mínimo aparecem mesmo sem consumo no período.',
        ],
      },
    });
  }

  private render<T>(
    res: Response,
    format: ExportFormat,
    filename: string,
    sheet: ExportSheet<T>,
  ): Promise<void> {
    const { columns, rows, meta, footer } = sheet;
    return this.stream(res, format, filename, (out) =>
      format === 'csv'
        ? writeCsv(out, columns, rows, footer)
        : writeXlsx(out, columns, rows, meta, footer),
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
