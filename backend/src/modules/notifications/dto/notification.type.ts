// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import { NotificationType as NotificationTypeEnum } from '../../../generated/prisma';

// ─────────────────────── Enum Registration ──────────────
registerEnumType(NotificationTypeEnum, {
  name: 'NotificationType',
  description: 'Tipo de notificação',
});

// ─────────────────────── Type ────────────────────────────
@ObjectType('Notification')
export class NotificationType {
  @Field(() => Int)
  readonly id: number;

  @Field(() => NotificationTypeEnum)
  readonly type: NotificationTypeEnum;

  @Field()
  readonly message: string;

  @Field()
  readonly isRead: boolean;

  @Field(() => Int)
  readonly userId: number;

  @Field(() => Int, { nullable: true })
  readonly workOrderId?: number;

  @Field(() => Int, { nullable: true })
  readonly sparePartId?: number;

  @Field()
  readonly createdAt: Date;
}
