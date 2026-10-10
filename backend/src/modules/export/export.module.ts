// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { WorkOrdersModule } from '../work-orders/work-orders.module';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [WorkOrdersModule],
  controllers: [ExportController],
  providers: [ExportService],
  exports: [ExportService],
})
export class ExportModule {}
