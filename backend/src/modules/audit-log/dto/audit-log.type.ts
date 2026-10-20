import { Field, Int, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AuditLogActorType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly name: string;

  @Field()
  readonly email: string;
}

@ObjectType()
export class AuditLogType {
  @Field(() => Int)
  readonly id: number;

  @Field(() => Int)
  readonly userId: number;

  @Field(() => AuditLogActorType, { nullable: true })
  readonly user?: AuditLogActorType;

  @Field()
  readonly action: string;

  @Field()
  readonly targetType: string;

  @Field(() => Int)
  readonly targetId: number;

  /** JSON serializado do estado anterior. */
  @Field({ nullable: true })
  readonly before?: string;

  /** JSON serializado do estado posterior. */
  @Field({ nullable: true })
  readonly after?: string;

  @Field()
  readonly createdAt: Date;
}
