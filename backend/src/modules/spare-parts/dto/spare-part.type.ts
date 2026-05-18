// ─────────────────────── Imports ────────────────────────
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('SparePart')
export class SparePartType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly name: string;

  @Field()
  readonly partNumber: string;

  @Field({ nullable: true })
  readonly description?: string;

  @Field(() => Int)
  readonly quantity: number;

  @Field(() => Int)
  readonly minimumStock: number;

  @Field(() => Float, { nullable: true })
  readonly unitCost?: number;

  @Field()
  readonly createdAt: Date;

  @Field()
  readonly updatedAt: Date;

  @Field({ nullable: true })
  readonly deletedAt?: Date;
}
