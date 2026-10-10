// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AssetCostType } from './dto/asset-cost.type';
import { FinanceFilterInput } from './dto/finance-filter.input';
import { type AssetCostRecord, FinanceService } from './finance.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver()
@UseGuards(JwtAuthGuard, PermissionGuard)
export class FinanceResolver {
  constructor(private readonly financeService: FinanceService) {}

  @Query(() => [AssetCostType])
  @RequiresPermission('cost.read')
  assetCosts(
    @Args('filter', { nullable: true }) filter?: FinanceFilterInput,
  ): Promise<AssetCostRecord[]> {
    return this.financeService.getAssetCosts(filter);
  }
}
