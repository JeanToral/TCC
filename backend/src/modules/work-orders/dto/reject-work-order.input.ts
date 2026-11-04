// ─────────────────────── Imports ────────────────────────
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, MaxLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class RejectWorkOrderInput {
  @Field()
  @Trim()
  @IsNotEmpty()
  @MaxLength(1000)
  readonly rejectionReason: string;
}
