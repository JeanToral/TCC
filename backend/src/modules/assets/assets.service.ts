// ─────────────────────── Imports ────────────────────────
import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { dayKey } from '../../common/reporting/month-buckets';
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

  async create(input: CreateAssetInput): Promise<AssetRecord> {
    this.assertInstallDateNotFuture(input.installDate);
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
    this.assertInstallDateNotFuture(input.installDate);
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

  /** Compara por dia no fuso da planta: instalar "hoje" é sempre válido. */
  private assertInstallDateNotFuture(installDate: Date | undefined): void {
    if (installDate && dayKey(installDate) > dayKey(new Date())) {
      throw new BadRequestException('Data de instalação não pode estar no futuro');
    }
  }

  async softDelete(id: number): Promise<AssetRecord> {
    const asset = await this.findById(id);
    if (asset.deletedAt) throw new BadRequestException(`Ativo ${id} já foi removido`);
    return this.repo.softDelete(id);
  }
}
