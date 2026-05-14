// ─────────────────────── Imports ────────────────────────
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CompleteWorkOrderInput {
  @Field()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly closingNotes: string;
}
