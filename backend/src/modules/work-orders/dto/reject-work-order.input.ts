// ─────────────────────── Imports ────────────────────────
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class RejectWorkOrderInput {
  @Field()
  @IsNotEmpty()
  @MaxLength(1000)
  readonly rejectionReason: string;
}
