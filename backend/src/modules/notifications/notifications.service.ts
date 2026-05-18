// ─────────────────────── Imports ────────────────────────
import { Injectable, Logger } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma';
import { type NotificationRecord, NotificationsRepository } from './notifications.repository';

// ─────────────────────── Service ────────────────────────
@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly repo: NotificationsRepository) {}

  notify(
    userId: number,
    type: NotificationType,
    message: string,
    refs?: { workOrderId?: number; sparePartId?: number },
  ): void {
    this.repo
      .create({ type, message, userId, ...refs })
      .catch((err: unknown) =>
        this.logger.error(`Notification failed: ${type} for user ${userId}`, err),
      );
  }

  findAll(userId: number, unreadOnly?: boolean): Promise<NotificationRecord[]> {
    return this.repo.findAll(userId, unreadOnly);
  }

  markAsRead(id: number, userId: number): Promise<NotificationRecord> {
    return this.repo.markAsRead(id, userId);
  }

  markAllAsRead(userId: number): Promise<void> {
    return this.repo.markAllAsRead(userId);
  }

  countUnread(userId: number): Promise<number> {
    return this.repo.countUnread(userId);
  }
}
