// ─────────────────────── Imports ────────────────────────
import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import { Transform, Type } from 'class-transformer';
import {
  IsBoolean,
  IsDate,
  IsEnum,
  IsIn,
  IsInt,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';
import type { Response } from 'express';
import { WorkOrderStatus } from '../../generated/prisma';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import type { ExportFormat } from './column-definition';
import { ExportService } from './export.service';

// ─────────────────────── Query DTO ──────────────────────
export class ExportWorkOrdersQuery {
  @IsIn(['csv', 'xlsx'])
  readonly format: ExportFormat;

  @IsOptional()
  @IsEnum(WorkOrderStatus)
  readonly status?: WorkOrderStatus;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  readonly assetId?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  readonly assignedToId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly to?: Date;
}

export class ExportAssetCostsQuery {
  @IsIn(['csv', 'xlsx'])
  readonly format: ExportFormat;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  readonly assetId?: number;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly from?: Date;

  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly to?: Date;
}

/** Abas de Relatórios: mesmo recorte do dashboard (ativo + período). */
export class ExportReportQuery extends ExportAssetCostsQuery {}

export class ExportSparePartsQuery {
  @IsIn(['csv', 'xlsx'])
  readonly format: ExportFormat;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  readonly search?: string;

  // `Boolean('false')` é true: a conversão precisa ser explícita.
  @IsOptional()
  @Transform(({ value }: { value: unknown }) =>
    value === 'true' ? true : value === 'false' ? false : value,
  )
  @IsBoolean()
  readonly lowStockOnly?: boolean;
}

// ─────────────────────── Controller ─────────────────────
/**
 * Exportação de planilhas por REST, fora do GraphQL: arquivo binário, em
 * streaming e acima do limite de complexidade do schema — ver ADR 0002.
 * Autenticação por `Authorization: Bearer`, igual ao GraphQL; o cookie de
 * refresh NÃO é aceito como credencial aqui.
 */
@Controller('export')
@UseGuards(JwtAuthGuard, PermissionGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('work-orders')
  @RequiresPermission('workorder.read')
  workOrders(
    @Query() query: ExportWorkOrdersQuery,
    @CurrentUser() viewer: JwtUser,
    @Res() res: Response,
  ): Promise<void> {
    const { format, ...filter } = query;
    return this.exportService.exportWorkOrders(format, filter, viewer, res);
  }

  @Get('asset-costs')
  @RequiresPermission('cost.read')
  assetCosts(
    @Query() query: ExportAssetCostsQuery,
    @CurrentUser() viewer: JwtUser,
    @Res() res: Response,
  ): Promise<void> {
    const { format, ...filter } = query;
    return this.exportService.exportAssetCosts(format, filter, viewer, res);
  }

  @Get('spare-parts')
  @RequiresPermission('sparepart.read')
  spareParts(
    @Query() query: ExportSparePartsQuery,
    @CurrentUser() viewer: JwtUser,
    @Res() res: Response,
  ): Promise<void> {
    const { format, ...filter } = query;
    return this.exportService.exportSpareParts(format, filter, viewer, res);
  }

  @Get('reliability')
  @RequiresPermission('dashboard.read')
  reliability(
    @Query() query: ExportReportQuery,
    @CurrentUser() viewer: JwtUser,
    @Res() res: Response,
  ): Promise<void> {
    const { format, ...filter } = query;
    return this.exportService.exportReliability(format, filter, viewer, res);
  }

  @Get('sla-breaches')
  @RequiresPermission('dashboard.read')
  slaBreaches(
    @Query() query: ExportReportQuery,
    @CurrentUser() viewer: JwtUser,
    @Res() res: Response,
  ): Promise<void> {
    const { format, ...filter } = query;
    return this.exportService.exportSlaBreaches(format, filter, viewer, res);
  }

  @Get('stock-consumption')
  @RequiresPermission('dashboard.read')
  stockConsumption(
    @Query() query: ExportReportQuery,
    @CurrentUser() viewer: JwtUser,
    @Res() res: Response,
  ): Promise<void> {
    const { format, ...filter } = query;
    return this.exportService.exportStockConsumption(format, filter, viewer, res);
  }
}
