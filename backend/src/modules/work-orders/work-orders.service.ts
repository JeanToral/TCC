// ─────────────────────── Imports ────────────────────────
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Priority, WorkOrderStatus } from '../../generated/prisma';
import { NotificationType } from '../../generated/prisma';

import { AuditLogService } from '../audit-log/audit-log.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SparePartsService } from '../spare-parts/spare-parts.service';
import { encodeCursor } from '../../common/pagination/page-args';
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

const SLA_HOURS: Record<Priority, number> = {
  [Priority.CRITICAL]: 2,
  [Priority.HIGH]: 8,
  [Priority.MEDIUM]: 48,
  [Priority.LOW]: 168,
};

// ─────────────────────── Service ────────────────────────
@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly repo: WorkOrdersRepository,
    private readonly audit: AuditLogService,
    private readonly notifications: NotificationsService,
    private readonly spareParts: SparePartsService,
  ) {}

  findAll(filter?: WorkOrdersFilterInput): Promise<WorkOrderRecord[]> {
    return this.repo.findAll(filter);
  }

  async findPaginated(filter: WorkOrdersFilterInput | undefined, first: number, after?: string) {
    const { items, hasNextPage } = await this.repo.findPaginated(filter, first, after);
    const edges = items.map((item) => ({ node: item, cursor: encodeCursor(item.id) }));
    return {
      edges,
      pageInfo: {
        hasNextPage,
        endCursor: edges.length > 0 ? edges[edges.length - 1].cursor : null,
      },
    };
  }

  async findById(id: number): Promise<WorkOrderRecord> {
    const workOrder = await this.repo.findById(id);
    if (!workOrder) throw new NotFoundException(`Ordem de serviço ${id} não encontrada`);
    return workOrder;
  }

  async create(input: CreateWorkOrderInput, requestedById: number): Promise<WorkOrderRecord> {
    const wo = await this.repo.create({
      title: input.title,
      description: input.description,
      type: input.type,
      priority: input.priority,
      assetId: input.assetId,
      requestedById,
    });

    this.audit.log(requestedById, 'workorder.create', 'WorkOrder', wo.id, null, {
      title: wo.title,
      type: wo.type,
      priority: wo.priority,
      status: wo.status,
    });

    return wo;
  }

  async approve(id: number, actorId: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.APPROVED);
    const updated = await this.repo.update(id, { status: WorkOrderStatus.APPROVED });
    this.audit.log(actorId, 'workorder.approve', 'WorkOrder', id,
      { status: workOrder.status }, { status: WorkOrderStatus.APPROVED });
    return updated;
  }

  async reject(id: number, input: RejectWorkOrderInput, actorId: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.REJECTED);
    const updated = await this.repo.update(id, {
      status: WorkOrderStatus.REJECTED,
      rejectionReason: input.rejectionReason,
    });
    this.audit.log(actorId, 'workorder.reject', 'WorkOrder', id,
      { status: workOrder.status }, { status: WorkOrderStatus.REJECTED });
    return updated;
  }

  async schedule(id: number, input: ScheduleWorkOrderInput, actorId: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.SCHEDULED);
    const updated = await this.repo.update(id, {
      status: WorkOrderStatus.SCHEDULED,
      assignedToId: input.assignedToId,
      scheduledStart: input.scheduledStart,
      scheduledEnd: input.scheduledEnd ?? null,
    });
    this.audit.log(actorId, 'workorder.schedule', 'WorkOrder', id,
      { status: workOrder.status }, { status: WorkOrderStatus.SCHEDULED });
    return updated;
  }

  async start(id: number, actorId: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.IN_PROGRESS);

    const startedAt = new Date();
    const updated = await this.repo.update(id, {
      status: WorkOrderStatus.IN_PROGRESS,
      startedAt,
    });

    this.audit.log(actorId, 'workorder.start', 'WorkOrder', id,
      { status: workOrder.status }, { status: WorkOrderStatus.IN_PROGRESS });

    this.checkSlaAndNotify(workOrder, startedAt, actorId);

    return updated;
  }

  async complete(id: number, input: CompleteWorkOrderInput, actorId: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.COMPLETED);
    const updated = await this.repo.update(id, {
      status: WorkOrderStatus.COMPLETED,
      closingNotes: input.closingNotes,
      completedAt: new Date(),
    });
    this.audit.log(actorId, 'workorder.complete', 'WorkOrder', id,
      { status: workOrder.status }, { status: WorkOrderStatus.COMPLETED });

    this.spareParts.decrementOnComplete(id, actorId).catch(() => undefined);

    return updated;
  }

  async cancel(id: number, input: CancelWorkOrderInput, actorId: number): Promise<WorkOrderRecord> {
    const workOrder = await this.findById(id);
    this.assertValidTransition(workOrder.status, WorkOrderStatus.CANCELLED);
    const updated = await this.repo.update(id, {
      status: WorkOrderStatus.CANCELLED,
      cancellationReason: input.cancellationReason,
    });
    this.audit.log(actorId, 'workorder.cancel', 'WorkOrder', id,
      { status: workOrder.status }, { status: WorkOrderStatus.CANCELLED });
    return updated;
  }

  async addWorkOrderPart(workOrderId: number, sparePartId: number, quantityUsed: number) {
    const wo = await this.findById(workOrderId);
    if (wo.status === WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Não é possível adicionar peças a uma OS já concluída');
    }
    return this.spareParts.addWorkOrderPart(workOrderId, sparePartId, quantityUsed);
  }

  async removeWorkOrderPart(workOrderId: number, sparePartId: number): Promise<void> {
    const wo = await this.findById(workOrderId);
    if (wo.status === WorkOrderStatus.COMPLETED) {
      throw new BadRequestException('Não é possível remover peças de uma OS já concluída');
    }
    return this.spareParts.removeWorkOrderPart(workOrderId, sparePartId);
  }

  private assertValidTransition(from: WorkOrderStatus, to: WorkOrderStatus): void {
    if (!VALID_TRANSITIONS[from].includes(to)) {
      throw new BadRequestException(`Transição inválida: ${from} → ${to}`);
    }
  }

  private checkSlaAndNotify(
    workOrder: WorkOrderRecord,
    startedAt: Date,
    actorId: number,
  ): void {
    const slaHours = SLA_HOURS[workOrder.priority];
    const deadline = new Date(workOrder.createdAt);
    deadline.setHours(deadline.getHours() + slaHours);

    if (startedAt > deadline) {
      this.notifications.notify(
        actorId,
        NotificationType.OVERDUE_WORK_ORDER,
        `OS #${workOrder.id} "${workOrder.title}" iniciada fora do SLA (${slaHours}h para prioridade ${workOrder.priority})`,
        { workOrderId: workOrder.id },
      );
    }
  }
}
