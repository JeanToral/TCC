// ─────────────────────── Imports ────────────────────────
import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { WorkOrderStatus } from '../../generated/prisma';

import { AuditLogService } from '../audit-log/audit-log.service';
import {
  type ExternalCostRecord,
  type WorkOrderCostInputs,
  WorkOrderCostsRepository,
} from './work-order-costs.repository';
import type { AddExternalCostInput } from './dto/add-external-cost.input';
import type { UpdateExternalCostInput } from './dto/update-external-cost.input';

// ─────────────────────── Types ───────────────────────────
export interface CostBreakdown {
  readonly partsCost: number;
  readonly laborCost: number;
  readonly externalCost: number;
  readonly total: number;
  readonly isComplete: boolean;
}

// ─────────────────────── Constants ──────────────────────
/**
 * Status em que lançar custo externo não faz sentido: a OS não gerou trabalho.
 * COMPLETED é permitido de propósito — a nota do fornecedor costuma chegar
 * depois do fechamento (ADR 0001).
 */
const BLOCKED_STATUSES: readonly WorkOrderStatus[] = [
  WorkOrderStatus.CANCELLED,
  WorkOrderStatus.REJECTED,
];

// ─────────────────────── Service ────────────────────────
@Injectable()
export class WorkOrderCostsService {
  constructor(
    private readonly repo: WorkOrderCostsRepository,
    private readonly audit: AuditLogService,
  ) {}

  findByWorkOrder(workOrderId: number): Promise<ExternalCostRecord[]> {
    return this.repo.findByWorkOrder(workOrderId);
  }

  async getBreakdown(workOrderId: number): Promise<CostBreakdown> {
    const inputs = await this.repo.findCostInputs(workOrderId);
    if (!inputs)
      throw new NotFoundException(
        `Ordem de serviço ${workOrderId} não encontrada`,
      );
    return this.composeBreakdown(inputs);
  }

  async add(
    input: AddExternalCostInput,
    actorId: number,
  ): Promise<ExternalCostRecord> {
    const status = await this.assertWorkOrderAcceptsCost(input.workOrderId);

    const created = await this.repo.create({
      workOrderId: input.workOrderId,
      description: input.description,
      supplier: input.supplier,
      amount: input.amount,
      incurredAt: input.incurredAt,
      createdById: actorId,
    });

    this.auditIfClosed(
      status,
      actorId,
      'workordercost.create',
      created.id,
      null,
      created,
    );

    return created;
  }

  async update(
    id: number,
    input: UpdateExternalCostInput,
    actorId: number,
  ): Promise<ExternalCostRecord> {
    const before = await this.findByIdOrFail(id);
    const status = await this.assertWorkOrderAcceptsCost(before.workOrderId);

    const updated = await this.repo.update(id, {
      description: input.description,
      supplier: input.supplier,
      amount: input.amount,
      incurredAt: input.incurredAt,
    });

    this.auditIfClosed(
      status,
      actorId,
      'workordercost.update',
      id,
      before,
      updated,
    );

    return updated;
  }

  async remove(id: number, actorId: number): Promise<void> {
    const before = await this.findByIdOrFail(id);
    const status = await this.assertWorkOrderAcceptsCost(before.workOrderId);

    await this.repo.remove(id);

    this.auditIfClosed(
      status,
      actorId,
      'workordercost.delete',
      id,
      before,
      null,
    );
  }

  // ── Internals ───────────────────────────────────────────
  private composeBreakdown(inputs: WorkOrderCostInputs): CostBreakdown {
    const partsCost = inputs.parts.reduce(
      (sum, part) => sum + part.quantityUsed * (part.unitCostSnapshot ?? 0),
      0,
    );

    const laborCost =
      (inputs.laborHours ?? 0) * (inputs.laborRateSnapshot ?? 0);
    const externalCost = inputs.externalAmounts.reduce(
      (sum, amount) => sum + amount,
      0,
    );

    return {
      partsCost,
      laborCost,
      externalCost,
      total: partsCost + laborCost + externalCost,
      isComplete: inputs.costIsComplete,
    };
  }

  private async findByIdOrFail(id: number): Promise<ExternalCostRecord> {
    const record = await this.repo.findById(id);
    if (!record)
      throw new NotFoundException(`Lançamento de custo ${id} não encontrado`);
    return record;
  }

  private async assertWorkOrderAcceptsCost(
    workOrderId: number,
  ): Promise<WorkOrderStatus> {
    const status = await this.repo.findWorkOrderStatus(workOrderId);
    if (status === null) {
      throw new NotFoundException(
        `Ordem de serviço ${workOrderId} não encontrada`,
      );
    }
    if (BLOCKED_STATUSES.includes(status)) {
      throw new BadRequestException(
        `Não é possível lançar custo em uma OS com status ${status}`,
      );
    }
    return status;
  }

  /**
   * Mexer no custo de uma OS já concluída altera um número que pode ter sido
   * exportado e apresentado. Toda alteração nesse estado deixa rastro.
   */
  private auditIfClosed(
    status: WorkOrderStatus,
    actorId: number,
    action: string,
    targetId: number,
    before: unknown,
    after: unknown,
  ): void {
    if (status !== WorkOrderStatus.COMPLETED) return;
    this.audit.log(
      actorId,
      action,
      'WorkOrderExternalCost',
      targetId,
      before,
      after,
    );
  }
}
