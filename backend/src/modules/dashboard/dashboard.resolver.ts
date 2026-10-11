// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { StatusCountRecord } from './dashboard.repository';
import {
  DashboardService,
  type AssetKpiRecord,
  type MonthlyTrendRecord,
  type SlaBreachRecord,
  type SlaRateRecord,
  type StockReportRecord,
} from './dashboard.service';
import { SlaBreachType } from './dto/sla-breach.type';
import { StockReportRowType } from './dto/stock-report-row.type';
import { AssetKpiType } from './dto/asset-kpi.type';
import { MonthlyTrendPointType } from './dto/monthly-trend-point.type';
import { StatusCountType } from './dto/status-count.type';
import { SlaRateType } from './dto/sla-rate.type';
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

  @Query(() => SlaRateType)
  @RequiresPermission('dashboard.read')
  dashboardSlaRate(
    @Args('filter', { nullable: true }) filter?: DashboardFilterInput,
  ): Promise<SlaRateRecord> {
    return this.dashboardService.getSlaRate(filter);
  }

  @Query(() => [StatusCountType])
  @RequiresPermission('dashboard.read')
  dashboardStatusCounts(
    @Args('filter', { nullable: true }) filter?: DashboardFilterInput,
  ): Promise<StatusCountRecord[]> {
    return this.dashboardService.getStatusCounts(filter);
  }

  @Query(() => [MonthlyTrendPointType])
  @RequiresPermission('dashboard.read')
  dashboardMonthlyTrend(
    @Args('filter', { nullable: true }) filter?: DashboardFilterInput,
  ): Promise<MonthlyTrendRecord[]> {
    return this.dashboardService.getMonthlyTrend(filter);
  }

  @Query(() => [SlaBreachType])
  @RequiresPermission('dashboard.read')
  slaBreaches(
    @Args('filter', { nullable: true }) filter?: DashboardFilterInput,
  ): Promise<SlaBreachRecord[]> {
    return this.dashboardService.getSlaBreaches(filter);
  }

  @Query(() => [StockReportRowType])
  @RequiresPermission('dashboard.read')
  stockReport(
    @Args('filter', { nullable: true }) filter?: DashboardFilterInput,
  ): Promise<StockReportRecord[]> {
    return this.dashboardService.getStockReport(filter);
  }
}
