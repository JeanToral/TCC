// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { WorkOrderStatus, WorkOrderType } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface AssetSummary {
  readonly id: number;
  readonly name: string;
  readonly tag: string;
}

/** OS concluída, com os valores já congelados. Base do Custo Realizado. */
export interface CompletedCostRow {
  readonly id: number;
  readonly assetId: number;
  readonly asset: AssetSummary;
  readonly type: WorkOrderType;
  readonly completedAt: Date | null;
  readonly laborHours: number | null;
  readonly laborRateSnapshot: number | null;
  readonly costIsComplete: boolean;
  readonly parts: readonly {
    readonly quantityUsed: number;
    readonly unitCostSnapshot: number | null;
  }[];
}

/** Lançamento externo, atribuído ao período pela competência. */
export interface ExternalCostRow {
  readonly amount: number;
  readonly incurredAt: Date;
  readonly workOrder: {
    readonly assetId: number;
    readonly asset: AssetSummary;
    readonly type: WorkOrderType;
  };
}

/** OS aberta, precificada com valores ATUAIS. Base do Custo Previsto. */
export interface OpenCostRow {
  readonly assetId: number;
  readonly asset: AssetSummary;
  readonly laborHours: number | null;
  readonly assignedTo: { readonly hourlyRate: number | null } | null;
  readonly parts: readonly {
    readonly quantityUsed: number;
    readonly sparePart: { readonly unitCost: number | null };
  }[];
  readonly externalCosts: readonly { readonly amount: number }[];
}

// ─────────────────────── Constants ──────────────────────
const ASSET_SELECT = { id: true, name: true, tag: true } as const;

const OPEN_STATUSES: readonly WorkOrderStatus[] = [
  WorkOrderStatus.REQUESTED,
  WorkOrderStatus.APPROVED,
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.IN_PROGRESS,
];

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class FinanceRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Peças e mão de obra entram no período pela data de conclusão da OS.
   * Ativos com soft delete entram de propósito: o gasto histórico é real.
   */
  findCompleted(
    assetId?: number,
    from?: Date,
    to?: Date,
  ): Promise<CompletedCostRow[]> {
    return this.prisma.workOrder.findMany({
      where: {
        status: WorkOrderStatus.COMPLETED,
        deletedAt: null,
        AND: [
          ...(from ? [{ completedAt: { gte: from } }] : []),
          ...(to ? [{ completedAt: { lte: to } }] : []),
        ],
        ...(assetId !== undefined ? { assetId } : {}),
      },
      select: {
        id: true,
        assetId: true,
        asset: { select: ASSET_SELECT },
        type: true,
        completedAt: true,
        laborHours: true,
        laborRateSnapshot: true,
        costIsComplete: true,
        parts: { select: { quantityUsed: true, unitCostSnapshot: true } },
      },
    });
  }

  /**
   * Serviço externo entra pela COMPETÊNCIA (incurredAt), não pela data de
   * conclusão da OS nem pela de lançamento — ver ADR 0001.
   */
  findExternalCosts(
    assetId?: number,
    from?: Date,
    to?: Date,
  ): Promise<ExternalCostRow[]> {
    return this.prisma.workOrderExternalCost.findMany({
      where: {
        AND: [
          ...(from ? [{ incurredAt: { gte: from } }] : []),
          ...(to ? [{ incurredAt: { lte: to } }] : []),
        ],
        workOrder: {
          deletedAt: null,
          status: {
            notIn: [WorkOrderStatus.CANCELLED, WorkOrderStatus.REJECTED],
          },
          ...(assetId !== undefined ? { assetId } : {}),
        },
      },
      select: {
        amount: true,
        incurredAt: true,
        workOrder: {
          select: {
            assetId: true,
            asset: { select: ASSET_SELECT },
            type: true,
          },
        },
      },
    });
  }

  /**
   * OS ainda abertas, precificadas com os valores vigentes. É estimativa:
   * nunca somar ao Custo Realizado.
   */
  findOpen(assetId?: number): Promise<OpenCostRow[]> {
    return this.prisma.workOrder.findMany({
      where: {
        status: { in: [...OPEN_STATUSES] },
        deletedAt: null,
        ...(assetId !== undefined ? { assetId } : {}),
      },
      select: {
        assetId: true,
        asset: { select: ASSET_SELECT },
        laborHours: true,
        assignedTo: { select: { hourlyRate: true } },
        parts: {
          select: {
            quantityUsed: true,
            sparePart: { select: { unitCost: true } },
          },
        },
        externalCosts: { select: { amount: true } },
      },
    });
  }
}
