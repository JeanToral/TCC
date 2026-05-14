// ─────────────────────── Imports ────────────────────────
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { type AssetRecord, AssetsRepository } from './assets.repository';
import type { CreateAssetInput } from './dto/create-asset.input';
import type { UpdateAssetInput } from './dto/update-asset.input';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class AssetsService {
  constructor(private readonly repo: AssetsRepository) {}

  findAll(): Promise<AssetRecord[]> {
    return this.repo.findAll();
  }

  async findById(id: number): Promise<AssetRecord> {
    const asset = await this.repo.findById(id);
    if (!asset) throw new NotFoundException(`Ativo ${id} não encontrado`);
    return asset;
  }

  create(input: CreateAssetInput): Promise<AssetRecord> {
    return this.repo.create({
      name: input.name,
      tag: input.tag,
      location: input.location,
      manufacturer: input.manufacturer,
      model: input.model,
      serialNumber: input.serialNumber,
      installDate: input.installDate,
    });
  }

  async update(id: number, input: UpdateAssetInput): Promise<AssetRecord> {
    await this.findById(id);
    return this.repo.update(id, {
      name: input.name,
      tag: input.tag,
      location: input.location ?? null,
      manufacturer: input.manufacturer ?? null,
      model: input.model ?? null,
      serialNumber: input.serialNumber ?? null,
      installDate: input.installDate ?? null,
    });
  }

  async softDelete(id: number): Promise<AssetRecord> {
    const asset = await this.findById(id);
    if (asset.deletedAt) throw new BadRequestException(`Ativo ${id} já foi removido`);
    return this.repo.softDelete(id);
  }
}
