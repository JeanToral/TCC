// ─────────────────────── Imports ────────────────────────
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('WorkOrderExternalCost')
export class WorkOrderExternalCostType {
  @Field(() => Int)
  readonly id: number;

  @Field(() => Int)
  readonly workOrderId: number;

  @Field()
  readonly description: string;

  @Field({ nullable: true })
  readonly supplier?: string;

  @Field(() => Float)
  readonly amount: number;

  /** Competência: mês ao qual o custo pertence economicamente. */
  @Field()
  readonly incurredAt: Date;

  @Field(() => Int)
  readonly createdById: number;

  @Field()
  readonly createdAt: Date;

  @Field()
  readonly updatedAt: Date;
}

/** Decomposição de custo de uma OS. Exposta apenas com cost.read. */
@ObjectType('WorkOrderCostBreakdown')
export class WorkOrderCostBreakdownType {
  @Field(() => Float)
  readonly partsCost: number;

  @Field(() => Float)
  readonly laborCost: number;

  @Field(() => Float)
  readonly externalCost: number;

  @Field(() => Float)
  readonly total: number;

  /** false quando faltou preço de peça ou taxa horária. */
  @Field()
  readonly isComplete: boolean;
}
