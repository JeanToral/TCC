// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { AssetType } from './dto/asset.type';
import { CreateWorkOrderInput } from './dto/create-work-order.input';
import { RejectWorkOrderInput } from './dto/reject-work-order.input';
import { ScheduleWorkOrderInput } from './dto/schedule-work-order.input';
import { WorkOrdersFilterInput } from './dto/work-orders-filter.input';
import { WorkOrderType } from './dto/work-order.type';
import type { AssetRecord, WorkOrderRecord } from './work-orders.repository';
import { WorkOrdersService } from './work-orders.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => WorkOrderType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WorkOrdersResolver {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Query(() => [AssetType])
  @RequiresPermission('asset.read')
  assets(): Promise<AssetRecord[]> {
    return this.workOrdersService.findAllAssets();
  }

  @Query(() => [WorkOrderType])
  @RequiresPermission('workorder.read')
  workOrders(
    @Args('filter', { nullable: true }) filter?: WorkOrdersFilterInput,
  ): Promise<WorkOrderRecord[]> {
    return this.workOrdersService.findAll(filter);
  }

  @Query(() => WorkOrderType)
  @RequiresPermission('workorder.read')
  workOrder(@Args('id', { type: () => Int }) id: number): Promise<WorkOrderRecord> {
    return this.workOrdersService.findById(id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.create')
  createWorkOrder(
    @Args('input') input: CreateWorkOrderInput,
    @CurrentUser() user: JwtUser,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.create(input, user.id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.approve')
  approveWorkOrder(@Args('id', { type: () => Int }) id: number): Promise<WorkOrderRecord> {
    return this.workOrdersService.approve(id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.approve')
  rejectWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: RejectWorkOrderInput,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.reject(id, input);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.update')
  scheduleWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: ScheduleWorkOrderInput,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.schedule(id, input);
  }
}
