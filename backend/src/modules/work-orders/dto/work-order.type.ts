// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType, registerEnumType } from '@nestjs/graphql';
import {
  Priority,
  WorkOrderStatus,
  WorkOrderType as WorkOrderTypeEnum,
} from '../../../generated/prisma';

import { UserType } from '../../users/dto/user.type';
import { AssetType } from './asset.type';

// ─────────────────────── Enum Registration ──────────────
registerEnumType(WorkOrderTypeEnum, {
  name: 'WorkOrderType',
  description: 'Tipo da ordem de serviço',
});

registerEnumType(Priority, {
  name: 'Priority',
  description: 'Prioridade da ordem de serviço',
});

registerEnumType(WorkOrderStatus, {
  name: 'WorkOrderStatus',
  description: 'Status da ordem de serviço',
});

// ─────────────────────── Type ────────────────────────────
@ObjectType('WorkOrder')
export class WorkOrderType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly title: string;

  @Field()
  readonly description: string;

  @Field(() => WorkOrderTypeEnum)
  readonly type: WorkOrderTypeEnum;

  @Field(() => Priority)
  readonly priority: Priority;

  @Field(() => WorkOrderStatus)
  readonly status: WorkOrderStatus;

  @Field(() => Int)
  readonly assetId: number;

  @Field(() => AssetType)
  readonly asset: AssetType;

  @Field(() => Int)
  readonly requestedById: number;

  @Field(() => UserType)
  readonly requestedBy: UserType;

  @Field(() => Int, { nullable: true })
  readonly assignedToId?: number;

  @Field(() => UserType, { nullable: true })
  readonly assignedTo?: UserType;

  @Field({ nullable: true })
  readonly scheduledStart?: Date;

  @Field({ nullable: true })
  readonly scheduledEnd?: Date;

  @Field({ nullable: true })
  readonly rejectionReason?: string;

  @Field({ nullable: true })
  readonly closingNotes?: string;

  @Field({ nullable: true })
  readonly cancellationReason?: string;

  @Field({ nullable: true })
  readonly startedAt?: Date;

  @Field({ nullable: true })
  readonly completedAt?: Date;

  @Field()
  readonly createdAt: Date;

  @Field()
  readonly updatedAt: Date;

  @Field({ nullable: true })
  readonly deletedAt?: Date;
}
