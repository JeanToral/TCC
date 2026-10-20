// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Query, Resolver } from '@nestjs/graphql';

import { RequiresPermission } from '../../common/decorators/requires-permission.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import { PermissionGuard } from '../auth/guards/permission.guard';
import { AuditLogConnection } from './dto/audit-log-connection.type';
import { AuditLogType } from './dto/audit-log.type';
import { AuditLogService } from './audit-log.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => AuditLogType)
@UseGuards(JwtAuthGuard, PermissionGuard)
export class AuditLogResolver {
  constructor(private readonly auditLogService: AuditLogService) {}

  @Query(() => AuditLogConnection)
  @RequiresPermission('auditlog.read')
  auditLogs(
    @Args('targetType', { nullable: true }) targetType?: string,
    @Args('targetId', { type: () => Int, nullable: true }) targetId?: number,
    @Args('action', { nullable: true }) action?: string,
    @Args('first', { type: () => Int, nullable: true, defaultValue: 50 })
    first: number = 50,
    @Args('after', { nullable: true }) after?: string,
  ): Promise<AuditLogConnection> {
    return this.auditLogService.findPaginated(
      { targetType, targetId, action },
      Math.min(Math.max(first, 1), 100),
      after,
    );
  }
}
