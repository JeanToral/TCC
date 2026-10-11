// ─────────────────────── Imports ────────────────────────
import { Field, Float, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('MonthlyCostPoint')
export class MonthlyCostPointType {
  @Field({ description: 'Mês no fuso da planta, formato YYYY-MM' })
  readonly month: string;

  @Field(() => Float, { description: 'Custo realizado em OS corretivas' })
  readonly corrective: number;

  @Field(() => Float, { description: 'Custo realizado em OS preventivas' })
  readonly preventive: number;

  @Field(() => Float)
  readonly total: number;

  @Field(() => Int, { description: 'OS concluídas no mês sem preço de peça ou taxa horária' })
  readonly workOrdersWithIncompleteCost: number;
}
