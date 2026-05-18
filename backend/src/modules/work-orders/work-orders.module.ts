// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SparePartsModule } from '../spare-parts/spare-parts.module';
import { WorkOrdersRepository } from './work-orders.repository';
import { WorkOrdersResolver } from './work-orders.resolver';
import { WorkOrdersService } from './work-orders.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule, AuditLogModule, NotificationsModule, SparePartsModule],
  providers: [WorkOrdersResolver, WorkOrdersService, WorkOrdersRepository],
  exports: [WorkOrdersService],
})
export class WorkOrdersModule {}
