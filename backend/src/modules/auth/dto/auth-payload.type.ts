// ─────────────────────── Imports ────────────────────────
import { Field, ObjectType } from '@nestjs/graphql';

// ─────────────────────── Type ────────────────────────────
@ObjectType()
export class AuthPayload {
  @Field()
  readonly accessToken: string;
}
