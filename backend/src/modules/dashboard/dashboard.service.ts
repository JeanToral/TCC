// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { WorkOrderStatus, WorkOrderType } from '../../generated/prisma';

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

// SLA deadline in hours per priority
const SLA_HOURS: Record<string, number> = {
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
