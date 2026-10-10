// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AuditLogModule } from '../audit-log/audit-log.module';
import { WorkOrderCostsRepository } from './work-order-costs.repository';
import {
  WorkOrderCostsResolver,
  WorkOrderPartCostResolver,
} from './work-order-costs.resolver';
import { WorkOrderCostsService } from './work-order-costs.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule, AuditLogModule],
  providers: [
    WorkOrderCostsResolver,
    WorkOrderPartCostResolver,
    WorkOrderCostsService,
    WorkOrderCostsRepository,
  ],
  exports: [WorkOrderCostsService],
})
export class WorkOrderCostsModule {}
