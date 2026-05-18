// ─────────────────────── Imports ────────────────────────
import { Injectable } from '@nestjs/common';
import { NotificationType } from '../../generated/prisma';
import { PrismaService } from '../../prisma/prisma.service';

// ─────────────────────── Types ───────────────────────────
export interface NotificationRecord {
  readonly id: number;
  readonly type: NotificationType;
  readonly message: string;
  readonly isRead: boolean;
  readonly userId: number;
  readonly workOrderId: number | null;
  readonly sparePartId: number | null;
  readonly createdAt: Date;
}

export interface CreateNotificationData {
  readonly type: NotificationType;
  readonly message: string;
  readonly userId: number;
  readonly workOrderId?: number;
  readonly sparePartId?: number;
}

// ─────────────────────── Constants ──────────────────────
const NOTIFICATION_SELECT = {
  id: true,
  type: true,
  message: true,
  isRead: true,
  userId: true,
  workOrderId: true,
  sparePartId: true,
  createdAt: true,
} as const;

// ─────────────────────── Repository ─────────────────────
@Injectable()
export class NotificationsRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateNotificationData): Promise<NotificationRecord> {
    return this.prisma.notification.create({
      data: {
        type: data.type,
        message: data.message,
        userId: data.userId,
        ...(data.workOrderId ? { workOrderId: data.workOrderId } : {}),
        ...(data.sparePartId ? { sparePartId: data.sparePartId } : {}),
      },
      select: NOTIFICATION_SELECT,
    }) as Promise<NotificationRecord>;
  }

  findAll(userId: number, unreadOnly?: boolean): Promise<NotificationRecord[]> {
    return this.prisma.notification.findMany({
      where: {
        userId,
        ...(unreadOnly ? { isRead: false } : {}),
      },
      select: NOTIFICATION_SELECT,
      orderBy: { createdAt: 'desc' },
      take: 50,
    }) as Promise<NotificationRecord[]>;
  }

  markAsRead(id: number, userId: number): Promise<NotificationRecord> {
    return this.prisma.notification.update({
      where: { id, userId },
      data: { isRead: true },
      select: NOTIFICATION_SELECT,
    }) as Promise<NotificationRecord>;
  }

  markAllAsRead(userId: number): Promise<void> {
    return this.prisma.notification
      .updateMany({ where: { userId, isRead: false }, data: { isRead: true } })
      .then(() => undefined);
  }

  countUnread(userId: number): Promise<number> {
    return this.prisma.notification.count({ where: { userId, isRead: false } });
  }
}
