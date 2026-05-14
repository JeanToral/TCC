// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AssetType } from '../work-orders/dto/asset.type';
import { CreateAssetInput } from './dto/create-asset.input';
import { UpdateAssetInput } from './dto/update-asset.input';
import type { AssetRecord } from './assets.repository';
import { AssetsService } from './assets.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => AssetType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AssetsResolver {
  constructor(private readonly assetsService: AssetsService) {}

  @Query(() => [AssetType])
  @RequiresPermission('asset.read')
  assets(): Promise<AssetRecord[]> {
    return this.assetsService.findAll();
  }

  @Query(() => AssetType)
  @RequiresPermission('asset.read')
  asset(@Args('id', { type: () => Int }) id: number): Promise<AssetRecord> {
    return this.assetsService.findById(id);
  }

  @Mutation(() => AssetType)
  @RequiresPermission('asset.create')
  createAsset(@Args('input') input: CreateAssetInput): Promise<AssetRecord> {
    return this.assetsService.create(input);
  }

  @Mutation(() => AssetType)
  @RequiresPermission('asset.update')
  updateAsset(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateAssetInput,
  ): Promise<AssetRecord> {
    return this.assetsService.update(id, input);
  }

  @Mutation(() => AssetType)
  @RequiresPermission('asset.delete')
  deleteAsset(@Args('id', { type: () => Int }) id: number): Promise<AssetRecord> {
    return this.assetsService.softDelete(id);
  }
}
