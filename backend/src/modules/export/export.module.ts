// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { DashboardModule } from '../dashboard/dashboard.module';
import { FinanceModule } from '../finance/finance.module';
import { SparePartsModule } from '../spare-parts/spare-parts.module';
import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [WorkOrdersModule, FinanceModule, SparePartsModule, DashboardModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
