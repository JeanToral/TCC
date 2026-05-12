// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { WorkOrdersRepository } from './work-orders.repository';
import { WorkOrdersResolver } from './work-orders.resolver';
import { WorkOrdersService } from './work-orders.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule],
  providers: [WorkOrdersResolver, WorkOrdersService, WorkOrdersRepository],
})
export class WorkOrdersModule {}
