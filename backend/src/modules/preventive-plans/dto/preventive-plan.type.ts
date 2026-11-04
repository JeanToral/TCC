// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

import { AssetType } from '../../assets/dto/asset.type';

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

/** Resultado de "Gerar OS vencidas": cada plano vencido cai em exatamente um grupo. */
@ObjectType('PreventiveGenerationResult')
export class PreventiveGenerationResultType {
  @Field(() => Int, { description: 'Planos que geraram OS nesta rodada' })
  readonly generated: number;

  @Field(() => Int, { description: 'Planos pulados por já terem OS aberta' })
  readonly skipped: number;

  @Field(() => [String], { description: 'Nomes dos planos em que a geração falhou' })
  readonly failedPlans: string[];
}
