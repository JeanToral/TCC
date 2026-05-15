// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { DashboardService, type AssetKpiRecord } from './dashboard.service';
import { AssetKpiType } from './dto/asset-kpi.type';
import { DashboardFilterInput } from './dto/dashboard-filter.input';

// ─────────────────────── Resolver ────────────────────────
@Resolver()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class DashboardResolver {
  constructor(private readonly dashboardService: DashboardService) {}

  @Query(() => [AssetKpiType])
  @RequiresPermission('dashboard.read')
  dashboardKpis(
    @Args('filter', { nullable: true }) filter?: DashboardFilterInput,
  ): Promise<AssetKpiRecord[]> {
    return this.dashboardService.getKpis(filter);
  }
}
