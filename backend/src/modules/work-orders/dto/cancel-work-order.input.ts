// ─────────────────────── Imports ────────────────────────
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CancelWorkOrderInput {
  @Field()
  @IsNotEmpty()
  @MaxLength(1000)
  readonly cancellationReason: string;
}
