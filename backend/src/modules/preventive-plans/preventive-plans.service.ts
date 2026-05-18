// ─────────────────────── Imports ────────────────────────
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Priority, WorkOrderType } from '../../generated/prisma';

import { WorkOrdersService } from '../work-orders/work-orders.service';
import { type PreventivePlanRecord, PreventivePlansRepository } from './preventive-plans.repository';
import type { CreatePreventivePlanInput } from './dto/create-preventive-plan.input';
import type { UpdatePreventivePlanInput } from './dto/update-preventive-plan.input';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class PreventivePlansService {
  private readonly logger = new Logger(PreventivePlansService.name);

  constructor(
    private readonly repo: PreventivePlansRepository,
    private readonly workOrdersService: WorkOrdersService,
  ) {}

  findAll(assetId?: number): Promise<PreventivePlanRecord[]> {
    return this.repo.findAll(assetId);
  }

  async findById(id: number): Promise<PreventivePlanRecord> {
    const plan = await this.repo.findById(id);
    if (!plan) throw new NotFoundException(`Plano preventivo ${id} não encontrado`);
    return plan;
  }

  create(input: CreatePreventivePlanInput): Promise<PreventivePlanRecord> {
    return this.repo.create({
      ...input,
      nextDueAt: new Date(input.nextDueAt),
    });
  }

  async update(id: number, input: UpdatePreventivePlanInput): Promise<PreventivePlanRecord> {
    await this.findById(id);
    const { nextDueAt, ...rest } = input;
    return this.repo.update(id, {
      ...rest,
      ...(nextDueAt ? { nextDueAt: new Date(nextDueAt) } : {}),
    });
  }

  async delete(id: number): Promise<PreventivePlanRecord> {
    await this.findById(id);
    return this.repo.delete(id);
  }

  async generateDueWorkOrders(actorId: number): Promise<number> {
    const duePlans = await this.repo.findDue();
    let generated = 0;

    for (const plan of duePlans) {
      try {
        await this.workOrdersService.create(
          {
            title: `[Preventivo] ${plan.name}`,
            description: plan.description ?? `Manutenção preventiva: ${plan.name}`,
            type: WorkOrderType.PREVENTIVE,
            priority: Priority.MEDIUM,
            assetId: plan.assetId,
          },
          actorId,
        );

        const nextDueAt = new Date(plan.nextDueAt);
        nextDueAt.setDate(nextDueAt.getDate() + plan.intervalDays);

        await this.repo.update(plan.id, {
          lastGeneratedAt: new Date(),
          nextDueAt,
        });

        generated++;
      } catch (err: unknown) {
        this.logger.error(`Falha ao gerar OS preventiva para plano ${plan.id}`, err);
      }
    }

    return generated;
  }
}
