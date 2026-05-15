// ─────────────────────── Imports ────────────────────────
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('AssetKpi')
export class AssetKpiType {
  @Field(() => Int)
  readonly assetId: number;

  @Field()
  readonly assetName: string;

  @Field(() => Float, { nullable: true, description: 'Mean Time Between Failures em horas' })
  readonly mtbf: number | null;

  @Field(() => Float, { nullable: true, description: 'Mean Time To Repair em horas' })
  readonly mttr: number | null;

  @Field(() => Int)
  readonly totalWorkOrders: number;

  @Field(() => Int)
  readonly completedWorkOrders: number;
}
