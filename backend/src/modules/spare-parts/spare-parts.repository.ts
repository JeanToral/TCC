// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface SparePartRecord {
  readonly id: number;
  readonly name: string;
  readonly partNumber: string;
  readonly description: string | null;
  readonly quantity: number;
  readonly minimumStock: number;
  readonly unitCost: number | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface WorkOrderPartRecord {
  readonly id: number;
  readonly workOrderId: number;
  readonly sparePartId: number;
  readonly sparePart: { readonly id: number; readonly name: string; readonly partNumber: string };
  readonly quantityUsed: number;
  readonly createdAt: Date;
}

export interface CreateSparePartData {
  readonly name: string;
  readonly partNumber: string;
  readonly description?: string;
  readonly quantity?: number;
  readonly minimumStock?: number;
  readonly unitCost?: number;
}

export interface UpdateSparePartData {
  name?: string;
  description?: string;
  quantity?: number;
  minimumStock?: number;
  unitCost?: number;
}

// ─────────────────────── Constants ──────────────────────
const SPARE_PART_SELECT = {
  id: true,
  name: true,
  partNumber: true,
  description: true,
  quantity: true,
  minimumStock: true,
  unitCost: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class SparePartsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(search?: string): Promise<SparePartRecord[]> {
    return this.prisma.sparePart.findMany({
      where: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { name: { contains: search, mode: 'insensitive' } },
                { partNumber: { contains: search, mode: 'insensitive' } },
              ],
            }
          : {}),
      },
      select: SPARE_PART_SELECT,
      orderBy: { name: 'asc' },
    }) as Promise<SparePartRecord[]>;
  }

  findById(id: number): Promise<SparePartRecord | null> {
    return this.prisma.sparePart.findFirst({
      where: { id, deletedAt: null },
      select: SPARE_PART_SELECT,
    }) as Promise<SparePartRecord | null>;
  }

  create(data: CreateSparePartData): Promise<SparePartRecord> {
    return this.prisma.sparePart.create({
      data: {
        name: data.name,
        partNumber: data.partNumber,
        description: data.description,
        quantity: data.quantity ?? 0,
        minimumStock: data.minimumStock ?? 0,
        unitCost: data.unitCost,
      },
      select: SPARE_PART_SELECT,
    }) as Promise<SparePartRecord>;
  }

  update(id: number, data: UpdateSparePartData): Promise<SparePartRecord> {
    return this.prisma.sparePart.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      select: SPARE_PART_SELECT,
    }) as Promise<SparePartRecord>;
  }

  softDelete(id: number): Promise<SparePartRecord> {
    return this.prisma.sparePart.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: SPARE_PART_SELECT,
    }) as Promise<SparePartRecord>;
  }

  findWorkOrderParts(workOrderId: number): Promise<WorkOrderPartRecord[]> {
    return this.prisma.workOrderPart.findMany({
      where: { workOrderId },
      select: {
        id: true,
        workOrderId: true,
        sparePartId: true,
        sparePart: { select: { id: true, name: true, partNumber: true } },
        quantityUsed: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'asc' },
    }) as Promise<WorkOrderPartRecord[]>;
  }

  addWorkOrderPart(
    workOrderId: number,
    sparePartId: number,
    quantityUsed: number,
  ): Promise<WorkOrderPartRecord> {
    return this.prisma.workOrderPart.upsert({
      where: { workOrderId_sparePartId: { workOrderId, sparePartId } },
      create: { workOrderId, sparePartId, quantityUsed },
      update: { quantityUsed },
      select: {
        id: true,
        workOrderId: true,
        sparePartId: true,
        sparePart: { select: { id: true, name: true, partNumber: true } },
        quantityUsed: true,
        createdAt: true,
      },
    }) as Promise<WorkOrderPartRecord>;
  }

  removeWorkOrderPart(workOrderId: number, sparePartId: number): Promise<void> {
    return this.prisma.workOrderPart
      .delete({ where: { workOrderId_sparePartId: { workOrderId, sparePartId } } })
      .then(() => undefined);
  }

  decrementQuantity(sparePartId: number, amount: number): Promise<SparePartRecord> {
    return this.prisma.sparePart.update({
      where: { id: sparePartId },
      data: { quantity: { decrement: amount } },
      select: SPARE_PART_SELECT,
    }) as Promise<SparePartRecord>;
  }

  findByWorkOrder(workOrderId: number): Promise<{ sparePartId: number; quantityUsed: number }[]> {
    return this.prisma.workOrderPart.findMany({
      where: { workOrderId },
      select: { sparePartId: true, quantityUsed: true },
    });
  }
}
