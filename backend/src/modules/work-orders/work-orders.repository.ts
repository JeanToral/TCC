// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { Priority, WorkOrderStatus, WorkOrderType as WorkOrderTypeEnum } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';
import { decodeCursor } from '../../common/pagination/page-args';
import type { DecrementedPartRecord } from '../spare-parts/spare-parts.repository';

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
  readonly laborHours: number | null;
  readonly laborRateSnapshot: number | null;
  readonly costIsComplete: boolean;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CompleteWorkOrderData {
  readonly closingNotes: string;
  readonly completedAt: Date;
  readonly laborHours: number | null;
  readonly laborRateSnapshot: number | null;
  /** false quando há horas apontadas mas o responsável não tem taxa horária. */
  readonly laborCostIsComplete: boolean;
}

export interface CompleteWorkOrderResult {
  readonly workOrder: WorkOrderRecord;
  readonly decrementedParts: readonly DecrementedPartRecord[];
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
  laborHours: true,
  laborRateSnapshot: true,
  costIsComplete: true,
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

  async findPaginated(
    filter: { status?: WorkOrderStatus; assetId?: number; assignedToId?: number } | undefined,
    first: number,
    after?: string,
  ): Promise<{ items: WorkOrderRecord[]; hasNextPage: boolean }> {
    const where = {
      deletedAt: null,
      ...(filter?.status ? { status: filter.status } : {}),
      ...(filter?.assetId ? { assetId: filter.assetId } : {}),
      ...(filter?.assignedToId ? { assignedToId: filter.assignedToId } : {}),
    };

    const cursorId = after ? decodeCursor(after) : undefined;

    const rows = await this.prisma.workOrder.findMany({
      where,
      select: WORK_ORDER_SELECT,
      orderBy: { createdAt: 'desc' },
      take: first + 1,
      ...(cursorId !== undefined ? { cursor: { id: cursorId }, skip: 1 } : {}),
    }) as WorkOrderRecord[];

    const hasNextPage = rows.length > first;
    return { items: hasNextPage ? rows.slice(0, first) : rows, hasNextPage };
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

  /**
   * Taxa horária de um usuário, lida por consulta dedicada para não entrar no
   * WORK_ORDER_SELECT — hourlyRate é dado salarial (ADR 0001).
   */
  async findHourlyRate(userId: number): Promise<number | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { hourlyRate: true },
    });
    return user?.hourlyRate ?? null;
  }

  /**
   * Conclui a OS congelando os custos e dando baixa no estoque numa única
   * transação: status, snapshot de preço das peças e decremento não podem
   * divergir (ADR 0001). Se qualquer passo falhar, nada é gravado.
   */
  completeWithCostSnapshot(
    id: number,
    data: CompleteWorkOrderData,
  ): Promise<CompleteWorkOrderResult> {
    return this.prisma.$transaction(async (tx) => {
      const parts = await tx.workOrderPart.findMany({
        where: { workOrderId: id },
        select: {
          id: true,
          sparePartId: true,
          quantityUsed: true,
          sparePart: { select: { unitCost: true } },
        },
      });

      const decrementedParts: DecrementedPartRecord[] = [];
      let allPartsPriced = true;

      for (const part of parts) {
        const unitCost = part.sparePart.unitCost;
        if (unitCost === null) allPartsPriced = false;

        await tx.workOrderPart.update({
          where: { id: part.id },
          data: { unitCostSnapshot: unitCost },
        });

        const updated = await tx.sparePart.update({
          where: { id: part.sparePartId },
          data: { quantity: { decrement: part.quantityUsed } },
          select: {
            id: true,
            name: true,
            partNumber: true,
            quantity: true,
            minimumStock: true,
          },
        });
        decrementedParts.push(updated);
      }

      const workOrder = (await tx.workOrder.update({
        where: { id },
        data: {
          status: WorkOrderStatus.COMPLETED,
          closingNotes: data.closingNotes,
          completedAt: data.completedAt,
          laborHours: data.laborHours,
          laborRateSnapshot: data.laborRateSnapshot,
          costIsComplete: data.laborCostIsComplete && allPartsPriced,
          updatedAt: new Date(),
        },
        select: WORK_ORDER_SELECT,
      })) as WorkOrderRecord;

      return { workOrder, decrementedParts };
    });
  }
}
