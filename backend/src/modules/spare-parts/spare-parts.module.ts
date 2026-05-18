// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { SparePartsRepository } from './spare-parts.repository';
import { SparePartsResolver } from './spare-parts.resolver';
import { SparePartsService } from './spare-parts.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule, NotificationsModule],
  providers: [SparePartsService, SparePartsResolver, SparePartsRepository],
  exports: [SparePartsService],
})
export class SparePartsModule {}
