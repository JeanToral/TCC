// ─────────────────────── Imports ────────────────────────
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';
import { Priority, WorkOrderType } from '../../../generated/prisma';

// Registra os enums Priority e WorkOrderType no schema.
import '../../work-orders/dto/work-order.type';

// ─────────────────────── Type ────────────────────────────
@ObjectType('SlaBreach')
export class SlaBreachType {
  @Field(() => Int)
  readonly workOrderId: number;

  @Field()
  readonly title: string;

  @Field(() => Int)
  readonly assetId: number;

  @Field()
  readonly assetTag: string;

  @Field()
  readonly assetName: string;

  @Field(() => Priority)
  readonly priority: Priority;

  @Field(() => WorkOrderType)
  readonly type: WorkOrderType;

  @Field()
  readonly createdAt: Date;

  @Field()
  readonly startedAt: Date;

  @Field()
  readonly completedAt: Date;

  @Field(() => Int, { description: 'Prazo máximo para início, em horas' })
  readonly limitHours: number;

  @Field(() => Float, { description: 'Quanto o início passou do prazo, em horas' })
  readonly delayHours: number;
}
