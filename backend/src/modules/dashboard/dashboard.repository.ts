// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { WorkOrderStatus, WorkOrderType } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface CorrectiveWorkOrderRecord {
  readonly id: number;
  readonly assetId: number;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly asset: {
    readonly id: number;
    readonly name: string;
  };
}

export interface WorkOrderCountRecord {
  readonly assetId: number;
  readonly count: number;
}

// ─────────────────────── Constants ──────────────────────
const CORRECTIVE_WO_SELECT = {
  id: true,
  assetId: true,
  startedAt: true,
  completedAt: true,
  asset: {
    select: {
      id: true,
      name: true,
    },
  },
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class DashboardRepository {
  constructor(private readonly prisma: PrismaService) {}

  findCorrectiveCompleted(
    assetId?: number,
    from?: Date,
    to?: Date,
  ): Promise<CorrectiveWorkOrderRecord[]> {
    return this.prisma.workOrder.findMany({
      where: {
        type: WorkOrderType.CORRECTIVE,
        status: WorkOrderStatus.COMPLETED,
        deletedAt: null,
        startedAt: { not: null },
        AND: [
          { completedAt: { not: null } },
          ...(from ? [{ completedAt: { gte: from } }] : []),
          ...(to ? [{ completedAt: { lte: to } }] : []),
        ],
        ...(assetId !== undefined ? { assetId } : {}),
      },
      select: CORRECTIVE_WO_SELECT,
      orderBy: [{ assetId: 'asc' }, { completedAt: 'asc' }],
    }) as Promise<CorrectiveWorkOrderRecord[]>;
  }

  async countAllByAsset(assetIds: number[]): Promise<Map<number, number>> {
    const groups = await this.prisma.workOrder.groupBy({
      by: ['assetId'],
      where: {
        assetId: { in: assetIds },
        deletedAt: null,
      },
      _count: { id: true },
    });

    const map = new Map<number, number>();
    for (const g of groups) {
      map.set(g.assetId, g._count.id);
    }
    return map;
  }
}
