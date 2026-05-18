// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface PreventivePlanRecord {
  readonly id: number;
  readonly name: string;
  readonly description: string | null;
  readonly assetId: number;
  readonly intervalDays: number;
  readonly lastGeneratedAt: Date | null;
  readonly nextDueAt: Date;
  readonly isActive: boolean;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreatePreventivePlanData {
  readonly name: string;
  readonly description?: string;
  readonly assetId: number;
  readonly intervalDays: number;
  readonly nextDueAt: Date;
}

export interface UpdatePreventivePlanData {
  name?: string;
  description?: string;
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
  intervalDays: true,
  lastGeneratedAt: true,
  nextDueAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

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

  findDue(): Promise<PreventivePlanRecord[]> {
    return this.prisma.preventivePlan.findMany({
      where: { isActive: true, nextDueAt: { lte: new Date() } },
      select: PLAN_SELECT,
    }) as Promise<PreventivePlanRecord[]>;
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
