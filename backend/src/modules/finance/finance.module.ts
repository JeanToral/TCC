// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { FinanceRepository } from './finance.repository';
import { FinanceResolver } from './finance.resolver';
import { FinanceService } from './finance.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule],
  providers: [FinanceResolver, FinanceService, FinanceRepository],
  exports: [FinanceService],
})
export class FinanceModule {}
