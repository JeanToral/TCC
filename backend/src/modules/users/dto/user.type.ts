// ─────────────────────── Imports ────────────────────────
import { Field, Int, ObjectType } from '@nestjs/graphql';

import { RoleType } from './role.type';

// ─────────────────────── Type ────────────────────────────
@ObjectType()
export class UserType {
  @Field(() => Int)
  readonly id: number;

  @Field()
  readonly name: string;

  @Field()
  readonly email: string;

  @Field()
  readonly isActive: boolean;

  @Field(() => Int)
  readonly roleId: number;

  @Field(() => RoleType)
  readonly role: RoleType;

  @Field()
  readonly createdAt: Date;

  @Field()
  readonly updatedAt: Date;

  @Field({ nullable: true })
  readonly deletedAt?: Date;
}
