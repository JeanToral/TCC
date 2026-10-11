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

export interface SlaWorkOrderRecord {
  readonly id: number;
  readonly priority: string;
  readonly createdAt: Date;
  readonly startedAt: Date | null;
}

export interface StatusCountRecord {
  readonly status: WorkOrderStatus;
  readonly count: number;
}

export interface CompletedTrendRecord extends SlaWorkOrderRecord {
  readonly type: WorkOrderType;
  readonly completedAt: Date;
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

  findCompletedForSla(
    from?: Date,
    to?: Date,
    assetId?: number,
  ): Promise<SlaWorkOrderRecord[]> {
    return this.prisma.workOrder.findMany({
      where: {
        status: WorkOrderStatus.COMPLETED,
        startedAt: { not: null },
        deletedAt: null,
        AND: [
          ...(from ? [{ completedAt: { gte: from } }] : []),
          ...(to ? [{ completedAt: { lte: to } }] : []),
        ],
        ...(assetId !== undefined ? { assetId } : {}),
      },
      select: {
        id: true,
        priority: true,
        createdAt: true,
        startedAt: true,
      },
    }) as Promise<SlaWorkOrderRecord[]>;
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

  /** Status atual das OS abertas no período (por createdAt). */
  async countByStatus(
    from: Date,
    to: Date,
    assetId?: number,
  ): Promise<StatusCountRecord[]> {
    const groups = await this.prisma.workOrder.groupBy({
      by: ['status'],
      where: {
        deletedAt: null,
        createdAt: { gte: from, lte: to },
        ...(assetId !== undefined ? { assetId } : {}),
      },
      _count: { id: true },
    });
    return groups.map((g) => ({ status: g.status, count: g._count.id }));
  }

  async findCreatedDates(from: Date, to: Date, assetId?: number): Promise<Date[]> {
    const rows = await this.prisma.workOrder.findMany({
      where: {
        deletedAt: null,
        createdAt: { gte: from, lte: to },
        ...(assetId !== undefined ? { assetId } : {}),
      },
      select: { createdAt: true },
    });
    return rows.map((r) => r.createdAt);
  }

  findCompletedForTrend(
    from: Date,
    to: Date,
    assetId?: number,
  ): Promise<CompletedTrendRecord[]> {
    return this.prisma.workOrder.findMany({
      where: {
        status: WorkOrderStatus.COMPLETED,
        deletedAt: null,
        completedAt: { gte: from, lte: to },
        ...(assetId !== undefined ? { assetId } : {}),
      },
      select: {
        id: true,
        type: true,
        priority: true,
        createdAt: true,
        startedAt: true,
        completedAt: true,
      },
    }) as Promise<CompletedTrendRecord[]>;
  }
}
