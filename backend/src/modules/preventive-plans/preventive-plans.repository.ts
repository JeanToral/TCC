// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { WorkOrderStatus } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface PreventivePlanRecord {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly assetId: number;
  readonly asset: { readonly id: number; readonly name: string; readonly tag: string };
  readonly intervalDays: number;
  readonly lastGeneratedAt: Date | null;
  readonly nextDueAt: Date;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePreventivePlanData {
  readonly name: string;
  readonly description?: string | null;
  readonly assetId: number;
  readonly intervalDays: number;
  readonly nextDueAt: Date;
}

export interface UpdatePreventivePlanData {
  name?: string;
  description?: string | null;
  intervalDays?: number;
  nextDueAt?: Date;
  isActive?: boolean;
  lastGeneratedAt?: Date;
}

// ─────────────────────── Constants ──────────────────────
const PLAN_SELECT = {
  id: true,
  name: true,
  description: true,
  assetId: true,
  asset: { select: { id: true, name: true, tag: true } },
  intervalDays: true,
  lastGeneratedAt: true,
  nextDueAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

const OPEN_WORK_ORDER_STATUSES: WorkOrderStatus[] = [
  WorkOrderStatus.REQUESTED,
  WorkOrderStatus.APPROVED,
  WorkOrderStatus.SCHEDULED,
  WorkOrderStatus.IN_PROGRESS,
];

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class PreventivePlansRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(assetId?: number): Promise<PreventivePlanRecord[]> {
    return this.prisma.preventivePlan.findMany({
      where: { ...(assetId ? { assetId } : {}) },
      select: PLAN_SELECT,
      orderBy: { nextDueAt: 'asc' },
    }) as Promise<PreventivePlanRecord[]>;
  }

  /** Planos ativos com vencimento até `until`; o corte por dia fica no service. */
  findDue(until: Date): Promise<PreventivePlanRecord[]> {
    return this.prisma.preventivePlan.findMany({
      where: { isActive: true, nextDueAt: { lte: until } },
      select: PLAN_SELECT,
    }) as Promise<PreventivePlanRecord[]>;
  }

  async hasOpenWorkOrder(planId: number): Promise<boolean> {
    const count = await this.prisma.workOrder.count({
      where: {
        preventivePlanId: planId,
        status: { in: OPEN_WORK_ORDER_STATUSES },
        deletedAt: null,
      },
    });
    return count > 0;
  }

  findById(id: number): Promise<PreventivePlanRecord | null> {
    return this.prisma.preventivePlan.findFirst({
      where: { id },
      select: PLAN_SELECT,
    }) as Promise<PreventivePlanRecord | null>;
  }

  create(data: CreatePreventivePlanData): Promise<PreventivePlanRecord> {
    return this.prisma.preventivePlan.create({
      data: {
        name: data.name,
        description: data.description,
        assetId: data.assetId,
        intervalDays: data.intervalDays,
        nextDueAt: data.nextDueAt,
      },
      select: PLAN_SELECT,
    }) as Promise<PreventivePlanRecord>;
  }

  update(id: number, data: UpdatePreventivePlanData): Promise<PreventivePlanRecord> {
    return this.prisma.preventivePlan.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      select: PLAN_SELECT,
    }) as Promise<PreventivePlanRecord>;
  }

  delete(id: number): Promise<PreventivePlanRecord> {
    return this.prisma.preventivePlan.delete({
      where: { id },
      select: PLAN_SELECT,
    }) as Promise<PreventivePlanRecord>;
  }
}
