// ─────────────────────── Imports ────────────────────────
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '../../generated/prisma';

import { type WorkOrderRecord, WorkOrdersRepository } from './work-orders.repository';
import type { CreateWorkOrderInput } from './dto/create-work-order.input';
import type { RejectWorkOrderInput } from './dto/reject-work-order.input';
import type { CompleteWorkOrderInput } from './dto/complete-work-order.input';
import type { CancelWorkOrderInput } from './dto/cancel-work-order.input';
import type { ScheduleWorkOrderInput } from './dto/schedule-work-order.input';
import type { WorkOrdersFilterInput } from './dto/work-orders-filter.input';

// ─────────────────────── Constants ──────────────────────
const VALID_TRANSITIONS: Record<WorkOrderStatus, WorkOrderStatus[]> = {
  [WorkOrderStatus.REQUESTED]: [WorkOrderStatus.APPROVED, WorkOrderStatus.REJECTED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.APPROVED]: [WorkOrderStatus.SCHEDULED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.SCHEDULED]: [WorkOrderStatus.IN_PROGRESS, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.IN_PROGRESS]: [WorkOrderStatus.COMPLETED, WorkOrderStatus.CANCELLED],
  [WorkOrderStatus.COMPLETED]: [],
  [WorkOrderStatus.REJECTED]: [],
  [WorkOrderStatus.CANCELLED]: [],
};

// ─────────────────────── Service ────────────────────────
@Injectable()
export class WorkOrdersService {
  constructor(private readonly repo: WorkOrdersRepository) {}

  findAllAssets(): Promise<import('./work-orders.repository').AssetRecord[]> {
    return this.repo.findAllAssets();
  }

  findAll(filter?: WorkOrdersFilterInput): Promise<WorkOrderRecord[]> {
    return this.repo.findAll(filter);
  }

  async findById(id: number): Promise<WorkOrderRecord> {
    const workOrder = await this.repo.findById(id);
    if (!workOrder) throw new NotFoundException(`Ordem de serviço ${id} não encontrada`);
    return workOrder;
  }

  async create(input: CreateWorkOrderInput, requestedById: number): Promise<WorkOrderRecord> {
    return this.repo.create({
      title: input.title,
      description: input.description,
      type: input.type,
      priority: input.priority,
      assetId: input.assetId,
      requestedById,
    });
  }

  async approve(id: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.APPROVED);
    return this.repo.update(id, { status: WorkOrderStatus.APPROVED });
  }

  async reject(id: number, input: RejectWorkOrderInput): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.REJECTED);
    return this.repo.update(id, {
      status: WorkOrderStatus.REJECTED,
      rejectionReason: input.rejectionReason,
    });
  }

  async schedule(id: number, input: ScheduleWorkOrderInput): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.SCHEDULED);
    return this.repo.update(id, {
      status: WorkOrderStatus.SCHEDULED,
      assignedToId: input.assignedToId,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd ?? null,
    });
  }

  async start(id: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.IN_PROGRESS);
    return this.repo.update(id, {
      status: WorkOrderStatus.IN_PROGRESS,
      startedAt: new Date(),
    });
  }

  async complete(id: number, input: CompleteWorkOrderInput): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.COMPLETED);
    return this.repo.update(id, {
      status: WorkOrderStatus.COMPLETED,
      closingNotes: input.closingNotes,
      completedAt: new Date(),
    });
  }

  async cancel(id: number, input: CancelWorkOrderInput): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.CANCELLED);
    return this.repo.update(id, {
      status: WorkOrderStatus.CANCELLED,
      cancellationReason: input.cancellationReason,
    });
  }

  private assertValidTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
    if (!VALID_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(
        `Transição inválida: ${from} → ${to}`,
      );
    }
  }
}
