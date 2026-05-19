// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AssetType } from '../../work-orders/dto/asset.type';

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

  @Field(() => AssetType)
  readonly asset: AssetType;

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
