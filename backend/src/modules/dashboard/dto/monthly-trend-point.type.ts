// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('MonthlyTrendPoint')
export class MonthlyTrendPointType {
  @Field({ description: 'Mês no fuso da planta, formato YYYY-MM' })
  readonly month: string;

  @Field(() => Int, { description: 'OS abertas no mês (por createdAt)' })
  readonly opened: number;

  @Field(() => Int, { description: 'OS concluídas no mês (por completedAt)' })
  readonly completed: number;

  @Field(() => Int)
  readonly completedCorrective: number;

  @Field(() => Int)
  readonly completedPreventive: number;

  @Field(() => Int, { description: 'Concluídas no mês que iniciaram dentro do SLA' })
  readonly slaWithin: number;

  @Field(() => Int, { description: 'Concluídas no mês com início registrado' })
  readonly slaTotal: number;

  @Field(() => Int, { nullable: true, description: 'null quando não há OS no mês' })
  readonly slaPercentage: number | null;
}
