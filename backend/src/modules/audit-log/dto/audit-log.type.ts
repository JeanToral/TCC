import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuditLogType {
  @Field(() => Int)
  readonly id: number;

  @Field(() => Int)
  readonly userId: number;

  @Field()
  readonly action: string;

  @Field()
  readonly targetType: string;

  @Field(() => Int)
  readonly targetId: number;

  @Field({ nullable: true })
  readonly before?: string;

  @Field({ nullable: true })
  readonly after?: string;

  @Field()
  readonly createdAt: Date;
}
