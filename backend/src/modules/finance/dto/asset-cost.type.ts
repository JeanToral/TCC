// ─────────────────────── Imports ────────────────────────
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('AssetCost')
export class AssetCostType {
  @Field(() => Int)
  readonly assetId: number;

  @Field()
  readonly assetName: string;

  @Field()
  readonly assetTag: string;

  @Field(() => Float, { description: 'Peças consumidas, a preço congelado' })
  readonly realizedPartsCost: number;

  @Field(() => Float, { description: 'Horas apontadas × taxa congelada' })
  readonly realizedLaborCost: number;

  @Field(() => Float, { description: 'Serviços de terceiros, por competência' })
  readonly realizedExternalCost: number;

  @Field(() => Float, { description: 'Custo realizado total do período' })
  readonly realizedTotal: number;

  @Field(() => Float, { description: 'Parcela do realizado em OS corretivas' })
  readonly realizedCorrectiveCost: number;

  @Field(() => Float, { description: 'Parcela do realizado em OS preventivas' })
  readonly realizedPreventiveCost: number;

  @Field(() => Float, {
    description:
      'Estimativa de OS abertas, a preços atuais. Não somar ao realizado.',
  })
  readonly forecastTotal: number;

  @Field(() => Int)
  readonly completedWorkOrders: number;

  @Field(() => Int, { description: 'OS sem preço de peça ou sem taxa horária' })
  readonly workOrdersWithIncompleteCost: number;
}
