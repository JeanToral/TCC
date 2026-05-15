// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { DashboardRepository } from './dashboard.repository';
import { DashboardResolver } from './dashboard.resolver';
import { DashboardService } from './dashboard.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule],
  providers: [DashboardResolver, DashboardService, DashboardRepository],
  exports: [DashboardService],
})
export class DashboardModule {}
