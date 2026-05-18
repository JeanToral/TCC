// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AuditLogType } from './dto/audit-log.type';
import { AuditLogService } from './audit-log.service';
import type { AuditLogRecord } from './audit-log.repository';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => AuditLogType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditLogResolver {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Query(() => [AuditLogType])
  @RequiresPermission('auditlog.read')
  auditLogs(
    @Args('targetType', { nullable: true }) targetType?: string,
    @Args('targetId', { type: () => Int, nullable: true }) targetId?: number,
  ): Promise<AuditLogRecord[]> {
    return this.auditLogService.findAll({ targetType, targetId });
  }
}
