import { Field, ObjectType } from '@nestjs/graphql';
import { WorkOrderType } from './work-order.type';

@ObjectType()
export class WorkOrderPageInfo {
  @Field(() => Boolean)
  readonly hasNextPage!: boolean;

  @Field(() => String, { nullable: true })
  readonly endCursor!: string | null;
}

@ObjectType()
export class WorkOrderEdge {
  @Field(() => WorkOrderType)
  readonly node!: WorkOrderType;

  @Field(() => String)
  readonly cursor!: string;
}

@ObjectType()
export class WorkOrderConnection {
  @Field(() => [WorkOrderEdge])
  readonly edges!: WorkOrderEdge[];

  @Field(() => WorkOrderPageInfo)
  readonly pageInfo!: WorkOrderPageInfo;
}
