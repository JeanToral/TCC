// ─────────────────────── Imports ────────────────────────
import { Injectable, NotFoundException } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma';

import { NotificationsService } from '../notifications/notifications.service';
import { type SparePartRecord, type WorkOrderPartRecord, SparePartsRepository } from './spare-parts.repository';
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

  async update(id: number, input: UpdateSparePartInput): Promise<SparePartRecord> {
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

  async decrementOnComplete(workOrderId: number, actorId: number): Promise<void> {
    const parts = await this.repo.findByWorkOrder(workOrderId);
    for (const part of parts) {
      const updated = await this.repo.decrementQuantity(part.sparePartId, part.quantityUsed);
      if (updated.quantity < updated.minimumStock) {
        this.notifications.notify(
          actorId,
          NotificationType.LOW_STOCK,
          `Estoque baixo: ${updated.name} (${updated.partNumber}) — ${updated.quantity} restantes (mínimo: ${updated.minimumStock})`,
          { sparePartId: updated.id },
        );
      }
    }
  }
}
