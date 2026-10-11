// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { Priority, WorkOrderStatus, WorkOrderType } from '../../generated/prisma';

import { monthKey, monthKeysBetween, resolvePeriod } from '../../common/reporting/month-buckets';
import {
  type CorrectiveWorkOrderRecord,
  DashboardRepository,
  type SlaWorkOrderRecord,
  type StatusCountRecord,
} from './dashboard.repository';
import type { DashboardFilterInput } from './dto/dashboard-filter.input';

// ─────────────────────── Types ───────────────────────────
export interface AssetKpiRecord {
  readonly assetId: number;
  readonly assetName: string;
  readonly mtbf: number | null;
  readonly mttr: number | null;
  readonly totalWorkOrders: number;
  readonly completedWorkOrders: number;
}

export interface SlaRateRecord {
  readonly withinSla: number;
  readonly total: number;
  readonly percentage: number;
}

export interface SlaBreachRecord {
  readonly workOrderId: number;
  readonly title: string;
  readonly assetId: number;
  readonly assetTag: string;
  readonly assetName: string;
  readonly priority: Priority;
  readonly type: WorkOrderType;
  readonly createdAt: Date;
  readonly startedAt: Date;
  readonly completedAt: Date;
  readonly limitHours: number;
  readonly delayHours: number;
}

export interface StockReportRecord {
  readonly sparePartId: number;
  readonly partNumber: string;
  readonly name: string;
  readonly quantity: number;
  readonly minimumStock: number;
  readonly belowMinimum: boolean;
  readonly consumed: number;
  readonly workOrders: number;
}

export interface MonthlyTrendRecord {
  readonly month: string;
  readonly opened: number;
  readonly completed: number;
  readonly completedCorrective: number;
  readonly completedPreventive: number;
  readonly slaWithin: number;
  readonly slaTotal: number;
  readonly slaPercentage: number | null;
}

/** Ordem do fluxo da OS — é a ordem em que o gráfico de gargalo lê. */
const STATUS_ORDER: readonly WorkOrderStatus[] = [
  WorkOrderStatus.REQUESTED,
  WorkOrderStatus.APPROVED,
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.IN_PROGRESS,
  WorkOrderStatus.COMPLETED,
  WorkOrderStatus.REJECTED,
  WorkOrderStatus.CANCELLED,
];

/** Prazo máximo para início, em horas, por prioridade. */
export const SLA_HOURS: Record<string, number> = {
  CRITICAL: 2,
  HIGH: 8,
  MEDIUM: 48,
  LOW: 168,
};

// ─────────────────────── Service ────────────────────────
@Injectable()
export class DashboardService {
  constructor(private readonly repo: DashboardRepository) {}

  async getKpis(filter?: DashboardFilterInput): Promise<AssetKpiRecord[]> {
    const completedWos = await this.repo.findCorrectiveCompleted(
      filter?.assetId,
      filter?.from,
      filter?.to,
    );

    if (completedWos.length === 0) return [];

    const grouped = this.groupByAsset(completedWos);
    const assetIds = [...grouped.keys()];
    const totalCounts = await this.repo.countAllByAsset(assetIds);

    return assetIds.map((assetId) => {
      const wos = grouped.get(assetId)!;
      return {
        assetId,
        assetName: wos[0].asset.name,
        mtbf: this.calculateMTBF(wos),
        mttr: this.calculateMTTR(wos),
        totalWorkOrders: totalCounts.get(assetId) ?? 0,
        completedWorkOrders: wos.length,
      };
    });
  }

  async getSlaRate(filter?: DashboardFilterInput): Promise<SlaRateRecord> {
    const wos = await this.repo.findCompletedForSla(
      filter?.from ? new Date(filter.from) : undefined,
      filter?.to ? new Date(filter.to) : undefined,
      filter?.assetId,
    );

    if (wos.length === 0) return { withinSla: 0, total: 0, percentage: 0 };

    const withinSla = wos.filter((wo) => this.isWithinSla(wo)).length;
    const total = wos.filter((wo) => wo.startedAt !== null).length;
    const percentage = total > 0 ? Math.round((withinSla / total) * 100) : 0;
    return { withinSla, total, percentage };
  }

  /** Todos os status, inclusive os zerados, na ordem do fluxo. */
  async getStatusCounts(filter?: DashboardFilterInput): Promise<StatusCountRecord[]> {
    const { from, to } = resolvePeriod(filter?.from, filter?.to);
    const groups = await this.repo.countByStatus(from, to, filter?.assetId);
    const byStatus = new Map(groups.map((g) => [g.status, g.count]));
    return STATUS_ORDER.map((status) => ({ status, count: byStatus.get(status) ?? 0 }));
  }

  /**
   * Série mensal: abertas agrupam por createdAt; concluídas e SLA por
   * completedAt. Meses sem OS aparecem zerados para o eixo não pular.
   */
  async getMonthlyTrend(filter?: DashboardFilterInput): Promise<MonthlyTrendRecord[]> {
    const { from, to } = resolvePeriod(filter?.from, filter?.to);
    const [createdDates, completed] = await Promise.all([
      this.repo.findCreatedDates(from, to, filter?.assetId),
      this.repo.findCompletedForTrend(from, to, filter?.assetId),
    ]);

    const months = new Map(
      monthKeysBetween(from, to).map((month) => [
        month,
        {
          month,
          opened: 0,
          completed: 0,
          completedCorrective: 0,
          completedPreventive: 0,
          slaWithin: 0,
          slaTotal: 0,
        },
      ]),
    );

    for (const createdAt of createdDates) {
      const bucket = months.get(monthKey(createdAt));
      if (bucket) bucket.opened += 1;
    }

    for (const wo of completed) {
      const bucket = months.get(monthKey(wo.completedAt));
      if (!bucket) continue;
      bucket.completed += 1;
      if (wo.type === WorkOrderType.CORRECTIVE) bucket.completedCorrective += 1;
      else bucket.completedPreventive += 1;
      if (wo.startedAt) {
        bucket.slaTotal += 1;
        if (this.isWithinSla(wo)) bucket.slaWithin += 1;
      }
    }

    return [...months.values()].map((m) => ({
      ...m,
      slaPercentage: m.slaTotal > 0 ? Math.round((m.slaWithin / m.slaTotal) * 100) : null,
    }));
  }

  /** OS concluídas no período que começaram depois do prazo — maior atraso primeiro. */
  async getSlaBreaches(filter?: DashboardFilterInput): Promise<SlaBreachRecord[]> {
    const { from, to } = resolvePeriod(filter?.from, filter?.to);
    const wos = await this.repo.findCompletedSlaDetail(from, to, filter?.assetId);

    return wos
      .filter((wo) => !this.isWithinSla(wo))
      .map((wo) => {
        const limitHours = SLA_HOURS[wo.priority] ?? 168;
        const elapsedHours = (wo.startedAt.getTime() - wo.createdAt.getTime()) / 3_600_000;
        return {
          workOrderId: wo.id,
          title: wo.title,
          assetId: wo.asset.id,
          assetTag: wo.asset.tag,
          assetName: wo.asset.name,
          priority: wo.priority,
          type: wo.type,
          createdAt: wo.createdAt,
          startedAt: wo.startedAt,
          completedAt: wo.completedAt,
          limitHours,
          delayHours: elapsedHours - limitHours,
        };
      })
      .sort((a, b) => b.delayHours - a.delayHours);
  }

  /**
   * Peças abaixo do mínimo (saldo atual) somadas às consumidas no período.
   * Abaixo do mínimo primeiro; depois as de maior consumo.
   */
  async getStockReport(filter?: DashboardFilterInput): Promise<StockReportRecord[]> {
    const { from, to } = resolvePeriod(filter?.from, filter?.to);
    const [low, consumption] = await Promise.all([
      this.repo.findPartsBelowMinimum(),
      this.repo.sumConsumption(from, to, filter?.assetId),
    ]);

    const knownIds = new Set(low.map((p) => p.id));
    const missingIds = consumption.map((c) => c.sparePartId).filter((id) => !knownIds.has(id));
    const consumedParts = missingIds.length > 0 ? await this.repo.findPartsByIds(missingIds) : [];
    const byConsumption = new Map(consumption.map((c) => [c.sparePartId, c]));

    return [...low, ...consumedParts]
      .map((part) => ({
        sparePartId: part.id,
        partNumber: part.partNumber,
        name: part.name,
        quantity: part.quantity,
        minimumStock: part.minimumStock,
        belowMinimum: part.quantity < part.minimumStock,
        consumed: byConsumption.get(part.id)?.consumed ?? 0,
        workOrders: byConsumption.get(part.id)?.workOrders ?? 0,
      }))
      .sort(
        (a, b) =>
          Number(b.belowMinimum) - Number(a.belowMinimum) ||
          b.consumed - a.consumed ||
          a.partNumber.localeCompare(b.partNumber),
      );
  }

  private isWithinSla(wo: SlaWorkOrderRecord): boolean {
    if (!wo.startedAt) return false;
    const limitMs = (SLA_HOURS[wo.priority] ?? 168) * 3_600_000;
    return wo.startedAt.getTime() - wo.createdAt.getTime() <= limitMs;
  }

  private groupByAsset(
    wos: CorrectiveWorkOrderRecord[],
  ): Map<number, CorrectiveWorkOrderRecord[]> {
    const map = new Map<number, CorrectiveWorkOrderRecord[]>();
    for (const wo of wos) {
      const list = map.get(wo.assetId) ?? [];
      list.push(wo);
      map.set(wo.assetId, list);
    }
    return map;
  }

  private calculateMTTR(wos: CorrectiveWorkOrderRecord[]): number | null {
    const repairTimes = wos
      .filter((wo) => wo.startedAt && wo.completedAt)
      .map((wo) => (wo.completedAt!.getTime() - wo.startedAt!.getTime()) / 3_600_000);

    if (repairTimes.length === 0) return null;
    return repairTimes.reduce((sum, t) => sum + t, 0) / repairTimes.length;
  }

  private calculateMTBF(wos: CorrectiveWorkOrderRecord[]): number | null {
    const sorted = [...wos]
      .filter((wo) => wo.completedAt && wo.startedAt)
      .sort((a, b) => a.completedAt!.getTime() - b.completedAt!.getTime());

    if (sorted.length < 2) return null;

    const intervals: number[] = [];
    for (let i = 1; i < sorted.length; i++) {
      const prev = sorted[i - 1];
      const curr = sorted[i];
      const interval = (curr.startedAt!.getTime() - prev.completedAt!.getTime()) / 3_600_000;
      if (interval > 0) intervals.push(interval);
    }

    if (intervals.length === 0) return null;
    return intervals.reduce((sum, t) => sum + t, 0) / intervals.length;
  }
}
