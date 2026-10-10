// ─────────────────────── Imports ────────────────────────
import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma';

import { NotificationsService } from '../notifications/notifications.service';
import {
  type DecrementedPartRecord,
  type SparePartRecord,
  type WorkOrderPartRecord,
  SparePartsRepository,
} from './spare-parts.repository';
import type { CreateSparePartInput } from './dto/create-spare-part.input';
import type { UpdateSparePartInput } from './dto/update-spare-part.input';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class SparePartsService {
  constructor(
    private readonly repo: SparePartsRepository,
    private readonly notifications: NotificationsService,
  ) {}

  findAll(search?: string): Promise<SparePartRecord[]> {
    return this.repo.findAll(search);
  }

  async findById(id: number): Promise<SparePartRecord> {
    const part = await this.repo.findById(id);
    if (!part) throw new NotFoundException(`Peça ${id} não encontrada`);
    return part;
  }

  create(input: CreateSparePartInput): Promise<SparePartRecord> {
    return this.repo.create(input);
  }

  async update(
    id: number,
    input: UpdateSparePartInput,
  ): Promise<SparePartRecord> {
    await this.findById(id);
    return this.repo.update(id, input);
  }

  async delete(id: number): Promise<SparePartRecord> {
    await this.findById(id);
    return this.repo.softDelete(id);
  }

  findWorkOrderParts(workOrderId: number): Promise<WorkOrderPartRecord[]> {
    return this.repo.findWorkOrderParts(workOrderId);
  }

  async addWorkOrderPart(
    workOrderId: number,
    sparePartId: number,
    quantityUsed: number,
  ): Promise<WorkOrderPartRecord> {
    await this.findById(sparePartId);
    return this.repo.addWorkOrderPart(workOrderId, sparePartId, quantityUsed);
  }

  removeWorkOrderPart(workOrderId: number, sparePartId: number): Promise<void> {
    return this.repo.removeWorkOrderPart(workOrderId, sparePartId);
  }

  /**
   * Emite LOW_STOCK para as peças que ficaram abaixo do mínimo após a baixa.
   *
   * A baixa em si acontece dentro da transação de conclusão da OS
   * (WorkOrdersRepository.completeWithCostSnapshot), junto com o congelamento
   * dos preços — ver ADR 0001. Aqui fica só a notificação, que é
   * fire-and-forget e nunca deve derrubar a conclusão.
   */
  notifyLowStock(
    parts: readonly DecrementedPartRecord[],
    actorId: number,
  ): void {
    for (const part of parts) {
      if (part.quantity < part.minimumStock) {
        this.notifications.notify(
          actorId,
          NotificationType.LOW_STOCK,
          `Estoque baixo: ${part.name} (${part.partNumber}) — ${part.quantity} restantes (mínimo: ${part.minimumStock})`,
          { sparePartId: part.id },
        );
      }
    }
  }
}
