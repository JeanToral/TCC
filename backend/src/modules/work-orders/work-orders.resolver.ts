// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { CreateWorkOrderInput } from './dto/create-work-order.input';
import { RejectWorkOrderInput } from './dto/reject-work-order.input';
import { CompleteWorkOrderInput } from './dto/complete-work-order.input';
import { CancelWorkOrderInput } from './dto/cancel-work-order.input';
import { ScheduleWorkOrderInput } from './dto/schedule-work-order.input';
import { WorkOrdersFilterInput } from './dto/work-orders-filter.input';
import { WorkOrderType } from './dto/work-order.type';
import { WorkOrderConnection } from './dto/work-order-connection.type';
import type { WorkOrderRecord } from './work-orders.repository';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderPartType } from '../spare-parts/dto/work-order-part.type';
import { AddWorkOrderPartInput } from '../spare-parts/dto/add-work-order-part.input';
import type { WorkOrderPartRecord } from '../spare-parts/spare-parts.repository';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => WorkOrderType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WorkOrdersResolver {
  constructor(private readonly workOrdersService: WorkOrdersService) {}

  @Query(() => WorkOrderConnection)
  @RequiresPermission('workorder.read')
  workOrders(
    @Args('filter', { nullable: true }) filter?: WorkOrdersFilterInput,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 20 }) first: number = 20,
    @Args('after', { nullable: true }) after?: string,
  ) {
    return this.workOrdersService.findPaginated(filter, first, after);
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
  approveWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() actor: JwtUser,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.approve(id, actor.id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.approve')
  rejectWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: RejectWorkOrderInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.reject(id, input, actor.id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.update')
  scheduleWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: ScheduleWorkOrderInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.schedule(id, input, actor.id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.update')
  startWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() actor: JwtUser,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.start(id, actor.id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.update')
  completeWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: CompleteWorkOrderInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.complete(id, input, actor.id);
  }

  @Mutation(() => WorkOrderType)
  @RequiresPermission('workorder.approve')
  cancelWorkOrder(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: CancelWorkOrderInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<WorkOrderRecord> {
    return this.workOrdersService.cancel(id, input, actor.id);
  }

  @Mutation(() => WorkOrderPartType)
  @RequiresPermission('workorder.update')
  addWorkOrderPart(@Args('input') input: AddWorkOrderPartInput): Promise<WorkOrderPartRecord> {
    return this.workOrdersService.addWorkOrderPart(
      input.workOrderId,
      input.sparePartId,
      input.quantityUsed,
    );
  }

  @Mutation(() => Boolean)
  @RequiresPermission('workorder.update')
  async removeWorkOrderPart(
    @Args('workOrderId', { type: () => Int }) workOrderId: number,
    @Args('sparePartId', { type: () => Int }) sparePartId: number,
  ): Promise<boolean> {
    await this.workOrdersService.removeWorkOrderPart(workOrderId, sparePartId);
    return true;
  }
}
