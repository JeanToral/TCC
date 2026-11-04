// ─────────────────────── Imports ────────────────────────
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Priority, WorkOrderType } from '../../generated/prisma';

import { dayKey } from '../../common/reporting/month-buckets';
import { WorkOrdersService } from '../work-orders/work-orders.service';
import { type PreventivePlanRecord, PreventivePlansRepository } from './preventive-plans.repository';
import type { CreatePreventivePlanInput } from './dto/create-preventive-plan.input';
import type { UpdatePreventivePlanInput } from './dto/update-preventive-plan.input';

// ─────────────────────── Constants ──────────────────────
const DAY_MS = 24 * 60 * 60 * 1000;

// ─────────────────────── Types ──────────────────────────
export interface PreventiveGenerationResult {
  readonly generated: number;
  readonly skipped: number;
  readonly failedPlans: string[];
}

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

  async create(input: CreatePreventivePlanInput): Promise<PreventivePlanRecord> {
    return this.repo.create({
      ...input,
      nextDueAt: this.parseNextDueAt(input.nextDueAt),
    });
  }

  /** Plano atrasado continua editável: a data só é validada quando vem no input. */
  async update(id: number, input: UpdatePreventivePlanInput): Promise<PreventivePlanRecord> {
    await this.findById(id);
    const { nextDueAt, ...rest } = input;
    return this.repo.update(id, {
      ...rest,
      ...(nextDueAt ? { nextDueAt: this.parseNextDueAt(nextDueAt) } : {}),
    });
  }

  private parseNextDueAt(value: string): Date {
    const date = new Date(value);
    if (dayKey(date) < dayKey(new Date())) {
      throw new BadRequestException('Próxima execução não pode ser antes de hoje');
    }
    return date;
  }

  async delete(id: number): Promise<PreventivePlanRecord> {
    await this.findById(id);
    return this.repo.delete(id);
  }

  /**
   * Gera uma OS por plano vencido, salvo se o plano já tiver OS aberta.
   * Em ambos os casos nextDueAt avança em ciclos de intervalDays até passar
   * de agora: o calendário do plano é fixo e atrasos não viram OS acumuladas.
   * Falha num plano não interrompe os demais, mas é devolvida — nunca some.
   */
  async generateDueWorkOrders(actorId: number): Promise<PreventiveGenerationResult> {
    const now = new Date();
    // Vencido = dia do vencimento (fuso da planta) até hoje, não o instante:
    // o plano de hoje gravado ao meio-dia também entra se gerado às 8h.
    const today = dayKey(now);
    const duePlans = (await this.repo.findDue(new Date(now.getTime() + DAY_MS))).filter(
      (plan) => dayKey(plan.nextDueAt) <= today,
    );
    let generated = 0;
    let skipped = 0;
    const failedPlans: string[] = [];

    for (const plan of duePlans) {
      try {
        const nextDueAt = nextDueAfter(plan.nextDueAt, plan.intervalDays, now);

        if (await this.repo.hasOpenWorkOrder(plan.id)) {
          await this.repo.update(plan.id, { nextDueAt });
          skipped++;
          continue;
        }

        await this.workOrdersService.create(
          {
            title: `[Preventivo] ${plan.name}`,
            description: plan.description ?? `Manutenção preventiva: ${plan.name}`,
            type: WorkOrderType.PREVENTIVE,
            priority: Priority.MEDIUM,
            assetId: plan.assetId,
          },
          actorId,
          plan.id,
        );

        await this.repo.update(plan.id, { lastGeneratedAt: now, nextDueAt });
        generated++;
      } catch (err: unknown) {
        this.logger.error(`Falha ao gerar OS preventiva para plano ${plan.id}`, err);
        failedPlans.push(plan.name);
      }
    }

    return { generated, skipped, failedPlans };
  }
}

function nextDueAfter(from: Date, intervalDays: number, now: Date): Date {
  const next = new Date(from);
  do {
    next.setDate(next.getDate() + intervalDays);
  } while (next <= now);
  return next;
}
