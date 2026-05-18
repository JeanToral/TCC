// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { PreventivePlanType } from './dto/preventive-plan.type';
import { CreatePreventivePlanInput } from './dto/create-preventive-plan.input';
import { UpdatePreventivePlanInput } from './dto/update-preventive-plan.input';
import type { PreventivePlanRecord } from './preventive-plans.repository';
import { PreventivePlansService } from './preventive-plans.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => PreventivePlanType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class PreventivePlansResolver {
  constructor(private readonly preventivePlansService: PreventivePlansService) {}

  @Query(() => [PreventivePlanType])
  @RequiresPermission('workorder.read')
  preventivePlans(
    @Args('assetId', { type: () => Int, nullable: true }) assetId?: number,
  ): Promise<PreventivePlanRecord[]> {
    return this.preventivePlansService.findAll(assetId);
  }

  @Query(() => PreventivePlanType)
  @RequiresPermission('workorder.read')
  preventivePlan(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<PreventivePlanRecord> {
    return this.preventivePlansService.findById(id);
  }

  @Mutation(() => PreventivePlanType)
  @RequiresPermission('workorder.create')
  createPreventivePlan(
    @Args('input') input: CreatePreventivePlanInput,
  ): Promise<PreventivePlanRecord> {
    return this.preventivePlansService.create(input);
  }

  @Mutation(() => PreventivePlanType)
  @RequiresPermission('workorder.update')
  updatePreventivePlan(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdatePreventivePlanInput,
  ): Promise<PreventivePlanRecord> {
    return this.preventivePlansService.update(id, input);
  }

  @Mutation(() => PreventivePlanType)
  @RequiresPermission('workorder.delete')
  deletePreventivePlan(
    @Args('id', { type: () => Int }) id: number,
  ): Promise<PreventivePlanRecord> {
    return this.preventivePlansService.delete(id);
  }

  @Mutation(() => Int)
  @RequiresPermission('workorder.create')
  generateDuePreventiveWorkOrders(@CurrentUser() user: JwtUser): Promise<number> {
    return this.preventivePlansService.generateDueWorkOrders(user.id);
  }
}
