// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { PreventivePlansRepository } from './preventive-plans.repository';
import { PreventivePlansResolver } from './preventive-plans.resolver';
import { PreventivePlansService } from './preventive-plans.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule, WorkOrdersModule],
  providers: [PreventivePlansService, PreventivePlansResolver, PreventivePlansRepository],
})
export class PreventivePlansModule {}
