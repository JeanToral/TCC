// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('PreventivePlan')
export class PreventivePlanType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly name: string;

  @Field({ nullable: true })
  readonly description?: string;

  @Field(() => Int)
  readonly assetId: number;

  @Field(() => Int)
  readonly intervalDays: number;

  @Field({ nullable: true })
  readonly lastGeneratedAt?: Date;

  @Field()
  readonly nextDueAt: Date;

  @Field()
  readonly isActive: boolean;

  @Field()
  readonly createdAt: Date;

  @Field()
  readonly updatedAt: Date;
}
