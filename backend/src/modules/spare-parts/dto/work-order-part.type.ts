// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Types ───────────────────────────
@ObjectType('SparePartSummary')
export class SparePartSummaryType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly name: string;

  @Field()
  readonly partNumber: string;
}

@ObjectType('WorkOrderPart')
export class WorkOrderPartType {
  @Field(() => Int)
  readonly id: number;

  @Field(() => Int)
  readonly workOrderId: number;

  @Field(() => Int)
  readonly sparePartId: number;

  @Field(() => SparePartSummaryType)
  readonly sparePart: SparePartSummaryType;

  @Field(() => Int)
  readonly quantityUsed: number;

  @Field()
  readonly createdAt: Date;
}
