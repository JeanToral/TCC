// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuditLogRepository } from './audit-log.repository';
import { AuditLogResolver } from './audit-log.resolver';
import { AuditLogService } from './audit-log.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [AuthModule],
  providers: [AuditLogService, AuditLogResolver, AuditLogRepository],
  exports: [AuditLogService],
})
export class AuditLogModule {}
