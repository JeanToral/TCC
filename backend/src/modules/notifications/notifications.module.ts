// ─────────────────────── Imports ────────────────────────
import { Module } from '@nestjs/common';

import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsRepository } from './notifications.repository';
import { NotificationsResolver } from './notifications.resolver';
import { NotificationsService } from './notifications.service';

// ─────────────────────── Module ─────────────────────────
@Module({
  imports: [PrismaModule],
  providers: [NotificationsService, NotificationsResolver, NotificationsRepository],
  exports: [NotificationsService],
})
export class NotificationsModule {}
