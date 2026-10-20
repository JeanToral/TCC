import { Field, ObjectType } from '@nestjs/graphql';
import { AuditLogType } from './audit-log.type';

@ObjectType()
export class AuditLogPageInfo {
  @Field(() => Boolean)
  readonly hasNextPage!: boolean;

  @Field(() => String, { nullable: true })
  readonly endCursor!: string | null;
}

@ObjectType()
export class AuditLogEdge {
  @Field(() => AuditLogType)
  readonly node!: AuditLogType;

  @Field(() => String)
  readonly cursor!: string;
}

@ObjectType()
export class AuditLogConnection {
  @Field(() => [AuditLogEdge])
  readonly edges!: AuditLogEdge[];

  @Field(() => AuditLogPageInfo)
  readonly pageInfo!: AuditLogPageInfo;
}
