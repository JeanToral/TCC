// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface AssetRecord {
  readonly id: number;
  readonly name: string;
  readonly tag: string;
  readonly location: string | null;
  readonly manufacturer: string | null;
  readonly model: string | null;
  readonly serialNumber: string | null;
  readonly installDate: Date | null;
  readonly deletedAt: Date | null;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export interface CreateAssetData {
  readonly name: string;
  readonly tag: string;
  readonly location?: string;
  readonly manufacturer?: string;
  readonly model?: string;
  readonly serialNumber?: string;
  readonly installDate?: Date;
}

export interface UpdateAssetData {
  name?: string;
  tag?: string;
  location?: string | null;
  manufacturer?: string | null;
  model?: string | null;
  serialNumber?: string | null;
  installDate?: Date | null;
}

// ─────────────────────── Constants ──────────────────────
const ASSET_SELECT = {
  id: true,
  name: true,
  tag: true,
  location: true,
  manufacturer: true,
  model: true,
  serialNumber: true,
  installDate: true,
  deletedAt: true,
  createdAt: true,
  updatedAt: true,
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class AssetsRepository {
  constructor(private readonly prisma: PrismaService) {}

  findAll(): Promise<AssetRecord[]> {
    return this.prisma.asset.findMany({
      where: { deletedAt: null },
      select: ASSET_SELECT,
      orderBy: { name: 'asc' },
    }) as Promise<AssetRecord[]>;
  }

  findById(id: number): Promise<AssetRecord | null> {
    return this.prisma.asset.findFirst({
      where: { id, deletedAt: null },
      select: ASSET_SELECT,
    }) as Promise<AssetRecord | null>;
  }

  create(data: CreateAssetData): Promise<AssetRecord> {
    return this.prisma.asset.create({
      data: {
        name: data.name,
        tag: data.tag,
        location: data.location,
        manufacturer: data.manufacturer,
        model: data.model,
        serialNumber: data.serialNumber,
        installDate: data.installDate,
      },
      select: ASSET_SELECT,
    }) as Promise<AssetRecord>;
  }

  update(id: number, data: UpdateAssetData): Promise<AssetRecord> {
    return this.prisma.asset.update({
      where: { id },
      data: { ...data, updatedAt: new Date() },
      select: ASSET_SELECT,
    }) as Promise<AssetRecord>;
  }

  softDelete(id: number): Promise<AssetRecord> {
    return this.prisma.asset.update({
      where: { id },
      data: { deletedAt: new Date() },
      select: ASSET_SELECT,
    }) as Promise<AssetRecord>;
  }
}
