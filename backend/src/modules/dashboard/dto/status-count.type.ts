// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';
import { WorkOrderStatus } from '../../../generated/prisma';

// Registra o enum WorkOrderStatus no schema.
import '../../work-orders/dto/work-order.type';

// ─────────────────────── Type ────────────────────────────
@ObjectType('StatusCount')
export class StatusCountType {
  @Field(() => WorkOrderStatus)
  readonly status: WorkOrderStatus;

  @Field(() => Int)
  readonly count: number;
}
