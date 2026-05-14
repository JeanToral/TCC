// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { AssetsRepository } from './assets.repository';
import { AssetsResolver } from './assets.resolver';
import { AssetsService } from './assets.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule],
  providers: [AssetsResolver, AssetsService, AssetsRepository],
  exports: [AssetsService],
})
export class AssetsModule {}
