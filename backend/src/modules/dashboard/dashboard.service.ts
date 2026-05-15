// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { type CorrectiveWorkOrderRecord, DashboardRepository } from './dashboard.repository';
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
