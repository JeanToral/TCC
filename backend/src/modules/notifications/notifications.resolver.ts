// ─────────────────────── Imports ────────────────────────
import { UseGuards } from '@nestjs/common';
import { Args, Int, Mutation, Query, Resolver } from '@nestjs/graphql';

import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt.guard';
import type { JwtUser } from '../auth/jwt.strategy';
import { NotificationType } from './dto/notification.type';
import type { NotificationRecord } from './notifications.repository';
import { NotificationsService } from './notifications.service';

// ─────────────────────── Resolver ────────────────────────
@Resolver(() => NotificationType)
@UseGuards(JwtAuthGuard)
export class NotificationsResolver {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Query(() => [NotificationType])
  notifications(
    @CurrentUser() user: JwtUser,
    @Args('unreadOnly', { type: () => Boolean, nullable: true, defaultValue: false })
    unreadOnly: boolean,
  ): Promise<NotificationRecord[]> {
    return this.notificationsService.findAll(user.id, unreadOnly);
  }

  @Query(() => Int)
  unreadNotificationsCount(@CurrentUser() user: JwtUser): Promise<number> {
    return this.notificationsService.countUnread(user.id);
  }

  @Mutation(() => NotificationType)
  markNotificationRead(
    @Args('id', { type: () => Int }) id: number,
    @CurrentUser() user: JwtUser,
  ): Promise<NotificationRecord> {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Mutation(() => Boolean)
  markAllNotificationsRead(@CurrentUser() user: JwtUser): Promise<boolean> {
    return this.notificationsService.markAllAsRead(user.id).then(() => true);
  }
}
