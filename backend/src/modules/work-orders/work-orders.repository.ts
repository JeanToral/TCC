// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { Priority, WorkOrderStatus, WorkOrderType as WorkOrderTypeEnum } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface AssetRecord {
  readonly id: number;
  readonly name: string;
  readonly tag: string;
  readonly location: string | null;
}

export interface WorkOrderRecord {
  readonly id: number;
  readonly title: string;
  readonly description: string;
  readonly type: WorkOrderTypeEnum;
  readonly priority: Priority;
  readonly status: WorkOrderStatus;
  readonly assetId: number;
  readonly asset: AssetRecord;
  readonly requestedById: number;
  readonly requestedBy: {
    readonly id: number;
    readonly name: string;
    readonly email: string;
    readonly isActive: boolean;
    readonly roleId: number;
    readonly role: { readonly id: number; readonly name: string; readonly description: string | null; readonly permissions: unknown; readonly isSystem: boolean };
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly deletedAt: Date | null;
  };
  readonly assignedToId: number | null;
  readonly assignedTo: {
    readonly id: number;
    readonly name: string;
    readonly email: string;
    readonly isActive: boolean;
    readonly roleId: number;
    readonly role: { readonly id: number; readonly name: string; readonly description: string | null; readonly permissions: unknown; readonly isSystem: boolean };
    readonly createdAt: Date;
    readonly updatedAt: Date;
    readonly deletedAt: Date | null;
  } | null;
  readonly scheduledStart: Date | null;
  readonly scheduledEnd: Date | null;
  readonly rejectionReason: string | null;
  readonly closingNotes: string | null;
  readonly cancellationReason: string | null;
  readonly startedAt: Date | null;
  readonly completedAt: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateWorkOrderData {
  readonly title: string;
  readonly description: string;
  readonly type: WorkOrderTypeEnum;
  readonly priority: Priority;
  readonly assetId: number;
  readonly requestedById: number;
}

export interface UpdateWorkOrderData {
  status?: WorkOrderStatus;
  assignedToId?: number;
  scheduledStart?: Date;
  scheduledEnd?: Date | null;
  rejectionReason?: string;
  closingNotes?: string;
  cancellationReason?: string;
  startedAt?: Date;
  completedAt?: Date;
}

// ─────────────────────── Constants ──────────────────────
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  isActive: true,
  roleId: true,
  role: {
    select: {
      id: true,
      name: true,
      description: true,
      permissions: true,
      isSystem: true,
    },
  },
  createdAt: true,
  updatedAt: true,
  deletedAt: true,
} as const;

const WORK_ORDER_SELECT = {
  id: true,
  title: true,
  description: true,
  type: true,
  priority: true,
  status: true,
  assetId: true,
  asset: {
    select: { id: true, name: true, tag: true, location: true },
  },
  requestedById: true,
  requestedBy: { select: USER_SELECT },
  assignedToId: true,
  assignedTo: { select: USER_SELECT },
  scheduledStart: true,
  scheduledEnd: true,
  rejectionReason: true,
  closingNotes: true,
  cancellationReason: true,
  startedAt: true,
  completedAt: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class WorkOrdersRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(filter?: { status?: WorkOrderStatus; assetId?: number; assignedToId?: number }): Promise<WorkOrderRecord[]> {
    return this.prisma.workOrder.findMany({
      where: {
        deletedAt: null,
        ...(filter?.status ? { status: filter.status } : {}),
        ...(filter?.assetId ? { assetId: filter.assetId } : {}),
        ...(filter?.assignedToId ? { assignedToId: filter.assignedToId } : {}),
      },
      select: WORK_ORDER_SELECT,
      orderBy: { createdAt: 'desc' },
    }) as Promise<WorkOrderRecord[]>;
  }

  findById(id: number): Promise<WorkOrderRecord | null> {
    return this.prisma.workOrder.findFirst({
      where: { id, deletedAt: null },
      select: WORK_ORDER_SELECT,
    }) as Promise<WorkOrderRecord | null>;
  }

  create(data: CreateWorkOrderData): Promise<WorkOrderRecord> {
    return this.prisma.workOrder.create({
      data: {
        title: data.title,
        description: data.description,
        type: data.type,
        priority: data.priority,
        asset: { connect: { id: data.assetId } },
        requestedBy: { connect: { id: data.requestedById } },
      },
      select: WORK_ORDER_SELECT,
    }) as Promise<WorkOrderRecord>;
  }

  update(id: number, data: UpdateWorkOrderData): Promise<WorkOrderRecord> {
    const { assignedToId, ...rest } = data;
    return this.prisma.workOrder.update({
      where: { id },
      data: {
        ...rest,
        ...(assignedToId !== undefined ? { assignedTo: { connect: { id: assignedToId } } } : {}),
        updatedAt: new Date(),
      },
      select: WORK_ORDER_SELECT,
    }) as Promise<WorkOrderRecord>;
  }
}
