// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { WorkOrderType } from '../../generated/prisma';

import { monthKey, monthKeysBetween, resolvePeriod } from '../../common/reporting/month-buckets';

import {
  type AssetSummary,
  type CompletedCostRow,
  type ExternalCostRow,
  FinanceRepository,
  type OpenCostRow,
} from './finance.repository';
import type { FinanceFilterInput } from './dto/finance-filter.input';

// ─────────────────────── Types ───────────────────────────
export interface AssetCostRecord {
  readonly assetId: number;
  readonly assetName: string;
  readonly assetTag: string;

  /** Custo Realizado — OS concluídas, valores congelados. Número oficial. */
  readonly realizedPartsCost: number;
  readonly realizedLaborCost: number;
  readonly realizedExternalCost: number;
  readonly realizedTotal: number;

  /** Mesmo realizado, quebrado por tipo de manutenção. */
  readonly realizedCorrectiveCost: number;
  readonly realizedPreventiveCost: number;

  /** Custo Previsto — OS abertas, preços atuais. Estimativa. */
  readonly forecastTotal: number;

  /** Cobertura: quantas OS do recorte tiveram o custo calculável por inteiro. */
  readonly completedWorkOrders: number;
  readonly workOrdersWithIncompleteCost: number;
}

export interface MonthlyCostRecord {
  readonly month: string;
  readonly corrective: number;
  readonly preventive: number;
  readonly total: number;
  readonly workOrdersWithIncompleteCost: number;
}

interface Accumulator {
  asset: AssetSummary;
  realizedPartsCost: number;
  realizedLaborCost: number;
  realizedExternalCost: number;
  realizedCorrectiveCost: number;
  realizedPreventiveCost: number;
  forecastTotal: number;
  completedWorkOrders: number;
  workOrdersWithIncompleteCost: number;
}

// ─────────────────────── Service ────────────────────────
@Injectable()
export class FinanceService {
  constructor(private readonly repo: FinanceRepository) {}

  async getAssetCosts(filter?: FinanceFilterInput): Promise<AssetCostRecord[]> {
    const [completed, externals, open] = await Promise.all([
      this.repo.findCompleted(filter?.assetId, filter?.from, filter?.to),
      this.repo.findExternalCosts(filter?.assetId, filter?.from, filter?.to),
      this.repo.findOpen(filter?.assetId),
    ]);

    const byAsset = new Map<number, Accumulator>();

    this.accumulateCompleted(byAsset, completed);
    this.accumulateExternals(byAsset, externals);
    this.accumulateOpen(byAsset, open);

    return [...byAsset.values()]
      .map((acc) => this.toRecord(acc))
      .sort(
        (a, b) =>
          b.realizedTotal - a.realizedTotal ||
          a.assetTag.localeCompare(b.assetTag),
      );
  }

  /**
   * Custo Realizado por mês, corretiva × preventiva. Peças e mão de obra entram
   * pelo mês de conclusão; serviço externo pelo mês de competência (ADR 0001).
   */
  async getMonthlyCosts(filter?: FinanceFilterInput): Promise<MonthlyCostRecord[]> {
    const { from, to } = resolvePeriod(filter?.from, filter?.to);
    const [completed, externals] = await Promise.all([
      this.repo.findCompleted(filter?.assetId, from, to),
      this.repo.findExternalCosts(filter?.assetId, from, to),
    ]);

    const months = new Map(
      monthKeysBetween(from, to).map((month) => [
        month,
        { month, corrective: 0, preventive: 0, workOrdersWithIncompleteCost: 0 },
      ]),
    );

    const add = (date: Date, type: WorkOrderType, amount: number) => {
      const bucket = months.get(monthKey(date));
      if (!bucket) return;
      if (type === WorkOrderType.CORRECTIVE) bucket.corrective += amount;
      else bucket.preventive += amount;
    };

    for (const wo of completed) {
      if (!wo.completedAt) continue;
      add(wo.completedAt, wo.type, this.partsCost(wo) + this.laborCost(wo));
      if (!wo.costIsComplete) {
        const bucket = months.get(monthKey(wo.completedAt));
        if (bucket) bucket.workOrdersWithIncompleteCost += 1;
      }
    }

    for (const cost of externals) {
      add(cost.incurredAt, cost.workOrder.type, cost.amount);
    }

    return [...months.values()].map((m) => ({ ...m, total: m.corrective + m.preventive }));
  }

  // ── Acumuladores ────────────────────────────────────────
  private accumulateCompleted(
    byAsset: Map<number, Accumulator>,
    rows: readonly CompletedCostRow[],
  ): void {
    for (const wo of rows) {
      const acc = this.bucket(byAsset, wo.assetId, wo.asset);

      const partsCost = this.partsCost(wo);
      const laborCost = this.laborCost(wo);

      acc.realizedPartsCost += partsCost;
      acc.realizedLaborCost += laborCost;
      acc.completedWorkOrders += 1;
      if (!wo.costIsComplete) acc.workOrdersWithIncompleteCost += 1;

      this.addByType(acc, wo.type, partsCost + laborCost);
    }
  }

  private accumulateExternals(
    byAsset: Map<number, Accumulator>,
    rows: readonly ExternalCostRow[],
  ): void {
    for (const cost of rows) {
      const acc = this.bucket(
        byAsset,
        cost.workOrder.assetId,
        cost.workOrder.asset,
      );
      acc.realizedExternalCost += cost.amount;
      this.addByType(acc, cost.workOrder.type, cost.amount);
    }
  }

  private accumulateOpen(
    byAsset: Map<number, Accumulator>,
    rows: readonly OpenCostRow[],
  ): void {
    for (const wo of rows) {
      const acc = this.bucket(byAsset, wo.assetId, wo.asset);

      const partsCost = wo.parts.reduce(
        (sum, part) => sum + part.quantityUsed * (part.sparePart.unitCost ?? 0),
        0,
      );
      const laborCost = (wo.laborHours ?? 0) * (wo.assignedTo?.hourlyRate ?? 0);
      const externalCost = wo.externalCosts.reduce(
        (sum, c) => sum + c.amount,
        0,
      );

      acc.forecastTotal += partsCost + laborCost + externalCost;
    }
  }

  // ── Internals ───────────────────────────────────────────
  /** Valor ausente conta zero — e a OS é marcada como cobertura incompleta. */
  private partsCost(wo: CompletedCostRow): number {
    return wo.parts.reduce(
      (sum, part) => sum + part.quantityUsed * (part.unitCostSnapshot ?? 0),
      0,
    );
  }

  private laborCost(wo: CompletedCostRow): number {
    return (wo.laborHours ?? 0) * (wo.laborRateSnapshot ?? 0);
  }

  private bucket(
    byAsset: Map<number, Accumulator>,
    assetId: number,
    asset: AssetSummary,
  ): Accumulator {
    const existing = byAsset.get(assetId);
    if (existing) return existing;

    const fresh: Accumulator = {
      asset,
      realizedPartsCost: 0,
      realizedLaborCost: 0,
      realizedExternalCost: 0,
      realizedCorrectiveCost: 0,
      realizedPreventiveCost: 0,
      forecastTotal: 0,
      completedWorkOrders: 0,
      workOrdersWithIncompleteCost: 0,
    };
    byAsset.set(assetId, fresh);
    return fresh;
  }

  private addByType(
    acc: Accumulator,
    type: WorkOrderType,
    amount: number,
  ): void {
    if (type === WorkOrderType.CORRECTIVE) {
      acc.realizedCorrectiveCost += amount;
    } else {
      acc.realizedPreventiveCost += amount;
    }
  }

  private toRecord(acc: Accumulator): AssetCostRecord {
    return {
      assetId: acc.asset.id,
      assetName: acc.asset.name,
      assetTag: acc.asset.tag,
      realizedPartsCost: acc.realizedPartsCost,
      realizedLaborCost: acc.realizedLaborCost,
      realizedExternalCost: acc.realizedExternalCost,
      realizedTotal:
        acc.realizedPartsCost +
        acc.realizedLaborCost +
        acc.realizedExternalCost,
      realizedCorrectiveCost: acc.realizedCorrectiveCost,
      realizedPreventiveCost: acc.realizedPreventiveCost,
      forecastTotal: acc.forecastTotal,
      completedWorkOrders: acc.completedWorkOrders,
      workOrdersWithIncompleteCost: acc.workOrdersWithIncompleteCost,
    };
  }
}
