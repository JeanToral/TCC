// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface ExternalCostRecord {
  readonly id: number;
  readonly workOrderId: number;
  readonly description: string;
  readonly supplier: string | null;
  readonly amount: number;
  readonly incurredAt: Date;
  readonly createdById: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateExternalCostData {
  readonly workOrderId: number;
  readonly description: string;
  readonly supplier?: string;
  readonly amount: number;
  readonly incurredAt: Date;
  readonly createdById: number;
}

export interface UpdateExternalCostData {
  description?: string;
  supplier?: string;
  amount?: number;
  incurredAt?: Date;
}

/** Dados brutos para compor a decomposição de custo de uma OS. */
export interface WorkOrderCostInputs {
  readonly laborHours: number | null;
  readonly laborRateSnapshot: number | null;
  readonly costIsComplete: boolean;
  readonly parts: readonly {
    readonly quantityUsed: number;
    readonly unitCostSnapshot: number | null;
  }[];
  readonly externalAmounts: readonly number[];
}

// ─────────────────────── Constants ──────────────────────
const EXTERNAL_COST_SELECT = {
  id: true,
  workOrderId: true,
  description: true,
  supplier: true,
  amount: true,
  incurredAt: true,
  createdById: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class WorkOrderCostsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findByWorkOrder(workOrderId: number): Promise<ExternalCostRecord[]> {
    return this.prisma.workOrderExternalCost.findMany({
      where: { workOrderId },
      select: EXTERNAL_COST_SELECT,
      orderBy: { incurredAt: 'asc' },
    });
  }

  findById(id: number): Promise<ExternalCostRecord | null> {
    return this.prisma.workOrderExternalCost.findUnique({
      where: { id },
      select: EXTERNAL_COST_SELECT,
    });
  }

  create(data: CreateExternalCostData): Promise<ExternalCostRecord> {
    return this.prisma.workOrderExternalCost.create({
      data: {
        workOrderId: data.workOrderId,
        description: data.description,
        supplier: data.supplier,
        amount: data.amount,
        incurredAt: data.incurredAt,
        createdById: data.createdById,
      },
      select: EXTERNAL_COST_SELECT,
    });
  }

  update(
    id: number,
    data: UpdateExternalCostData,
  ): Promise<ExternalCostRecord> {
    return this.prisma.workOrderExternalCost.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      select: EXTERNAL_COST_SELECT,
    });
  }

  remove(id: number): Promise<void> {
    return this.prisma.workOrderExternalCost
      .delete({ where: { id } })
      .then(() => undefined);
  }

  /** Status da OS, para as regras de lançamento. */
  async findWorkOrderStatus(
    workOrderId: number,
  ): Promise<WorkOrderStatus | null> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, deletedAt: null },
      select: { status: true },
    });
    return wo?.status ?? null;
  }

  async findCostInputs(
    workOrderId: number,
  ): Promise<WorkOrderCostInputs | null> {
    const wo = await this.prisma.workOrder.findFirst({
      where: { id: workOrderId, deletedAt: null },
      select: {
        laborHours: true,
        laborRateSnapshot: true,
        costIsComplete: true,
        parts: { select: { quantityUsed: true, unitCostSnapshot: true } },
        externalCosts: { select: { amount: true } },
      },
    });

    if (!wo) return null;

    return {
      laborHours: wo.laborHours,
      laborRateSnapshot: wo.laborRateSnapshot,
      costIsComplete: wo.costIsComplete,
      parts: wo.parts,
      externalAmounts: wo.externalCosts.map((c) => c.amount),
    };
  }
}
