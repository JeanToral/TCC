import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType('SlaRate')
export class SlaRateType {
  @Field(() => Int)
  readonly withinSla: number;

  @Field(() => Int)
  readonly total: number;

  @Field()
  readonly percentage: number;
}
