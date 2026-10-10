// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import {
  Args,
  Float,
  Int,
  Mutation,
  Parent,
  ResolveField,
  Resolver,
} from '@nestjs/graphql';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import {
  hasPermission,
  PermissionGuard,
} from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { WorkOrderPartType } from '../spare-parts/dto/work-order-part.type';
import type { WorkOrderPartRecord } from '../spare-parts/spare-parts.repository';
import { WorkOrderType } from '../work-orders/dto/work-order.type';
import type { WorkOrderRecord } from '../work-orders/work-orders.repository';
import { AddExternalCostInput } from './dto/add-external-cost.input';
import { UpdateExternalCostInput } from './dto/update-external-cost.input';
import {
  WorkOrderCostBreakdownType,
  WorkOrderExternalCostType,
} from './dto/work-order-external-cost.type';
import type { ExternalCostRecord } from './work-order-costs.repository';
import { WorkOrderCostsService } from './work-order-costs.service';

// ─────────────────────── Resolver ────────────────────────
/**
 * Campos monetários da OS. Resolvem para `null` sem cost.read, em vez de
 * lançar erro — a tela de OS continua funcionando para o técnico, só sem R$.
 */
@Resolver(() => WorkOrderType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WorkOrderCostsResolver {
  constructor(private readonly costsService: WorkOrderCostsService) {}

  @ResolveField(() => WorkOrderCostBreakdownType, { nullable: true })
  async cost(
    @Parent() workOrder: WorkOrderRecord,
    @CurrentUser() viewer: JwtUser,
  ): Promise<WorkOrderCostBreakdownType | null> {
    if (!hasPermission(viewer.permissions, 'cost.read')) return null;
    return this.costsService.getBreakdown(workOrder.id);
  }

  @ResolveField(() => [WorkOrderExternalCostType], { nullable: true })
  async externalCosts(
    @Parent() workOrder: WorkOrderRecord,
    @CurrentUser() viewer: JwtUser,
  ): Promise<ExternalCostRecord[] | null> {
    if (!hasPermission(viewer.permissions, 'cost.read')) return null;
    return this.costsService.findByWorkOrder(workOrder.id);
  }

  @Mutation(() => WorkOrderExternalCostType)
  @RequiresPermission('cost.manage')
  addWorkOrderExternalCost(
    @Args('input') input: AddExternalCostInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<ExternalCostRecord> {
    return this.costsService.add(input, actor.id);
  }

  @Mutation(() => WorkOrderExternalCostType)
  @RequiresPermission('cost.manage')
  updateWorkOrderExternalCost(
    @Args('id', { type: () => Int }) id: number,
    @Args('input') input: UpdateExternalCostInput,
    @CurrentUser() actor: JwtUser,
  ): Promise<ExternalCostRecord> {
    return this.costsService.update(id, input, actor.id);
  }

  @Mutation(() => Boolean)
  @RequiresPermission('cost.manage')
  async removeWorkOrderExternalCost(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() actor: JwtUser,
  ): Promise<boolean> {
    await this.costsService.remove(id, actor.id);
    return true;
  }
}

/** Preço congelado da peça: valor monetário, portanto atrás de cost.read. */
@Resolver(() => WorkOrderPartType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class WorkOrderPartCostResolver {
  @ResolveField(() => Float, { nullable: true })
  unitCostSnapshot(
    @Parent() part: WorkOrderPartRecord,
    @CurrentUser() viewer: JwtUser,
  ): number | null {
    if (!hasPermission(viewer.permissions, 'cost.read')) return null;
    return part.unitCostSnapshot;
  }
}
