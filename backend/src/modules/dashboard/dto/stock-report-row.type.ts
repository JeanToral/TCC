// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType('StockReportRow')
export class StockReportRowType {
  @Field(() => Int)
  readonly sparePartId: number;

  @Field()
  readonly partNumber: string;

  @Field()
  readonly name: string;

  @Field(() => Int, { description: 'Saldo atual' })
  readonly quantity: number;

  @Field(() => Int)
  readonly minimumStock: number;

  @Field({ description: 'Saldo atual abaixo do mínimo' })
  readonly belowMinimum: boolean;

  @Field(() => Int, { description: 'Unidades consumidas em OS concluídas no período' })
  readonly consumed: number;

  @Field(() => Int, { description: 'OS concluídas no período que consumiram a peça' })
  readonly workOrders: number;
}
