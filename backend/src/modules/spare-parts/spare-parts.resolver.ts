// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { SparePartType } from './dto/spare-part.type';
import { WorkOrderPartType } from './dto/work-order-part.type';
import { CreateSparePartInput } from './dto/create-spare-part.input';
import { UpdateSparePartInput } from './dto/update-spare-part.input';
import type { SparePartRecord, WorkOrderPartRecord } from './spare-parts.repository';
import { SparePartsService } from './spare-parts.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => SparePartType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class SparePartsResolver {
  constructor(private readonly sparePartsService: SparePartsService) {}

  @Query(() => [SparePartType])
  @RequiresPermission('sparepart.read')
  spareParts(
    @Args('search', { nullable: true }) search?: string,
  ): Promise<SparePartRecord[]> {
    return this.sparePartsService.findAll(search);
  }

  @Query(() => SparePartType)
  @RequiresPermission('sparepart.read')
  sparePart(@Args('id', { type: () => Int }) id: number): Promise<SparePartRecord> {
    return this.sparePartsService.findById(id);
  }

  @Query(() => [WorkOrderPartType])
  @RequiresPermission('workorder.read')
  workOrderParts(
    @Args('workOrderId', { type: () => Int }) workOrderId: number,
  ): Promise<WorkOrderPartRecord[]> {
    return this.sparePartsService.findWorkOrderParts(workOrderId);
  }

  @Mutation(() => SparePartType)
  @RequiresPermission('sparepart.create')
  createSparePart(@Args('input') input: CreateSparePartInput): Promise<SparePartRecord> {
    return this.sparePartsService.create(input);
  }

  @Mutation(() => SparePartType)
  @RequiresPermission('sparepart.update')
  updateSparePart(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateSparePartInput,
  ): Promise<SparePartRecord> {
    return this.sparePartsService.update(id, input);
  }

  @Mutation(() => SparePartType)
  @RequiresPermission('sparepart.delete')
  deleteSparePart(@Args('id', { type: () => Int }) id: number): Promise<SparePartRecord> {
    return this.sparePartsService.delete(id);
  }
}
