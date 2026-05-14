// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType()
export class AssetType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly name: string;

  @Field()
  readonly tag: string;

  @Field({ nullable: true })
  readonly location?: string;

  @Field({ nullable: true })
  readonly manufacturer?: string;

  @Field({ nullable: true })
  readonly model?: string;

  @Field({ nullable: true })
  readonly serialNumber?: string;

  @Field({ nullable: true })
  readonly installDate?: Date;

  @Field({ nullable: true })
  readonly deletedAt?: Date;

  @Field()
  readonly createdAt: Date;

  @Field()
  readonly updatedAt: Date;
}
