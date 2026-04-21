// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType()
export class RoleType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly name: string;

  @Field({ nullable: true })
  readonly description?: string;

  @Field(() => [String])
  readonly permissions: string[];

  @Field()
  readonly isSystem: boolean;
}
