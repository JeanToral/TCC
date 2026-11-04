// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CreatePreventivePlanInput {
  @Field()
  @Trim()
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @Field(() => String, { nullable: true })
  @Trim({ emptyToNull: true })
  @IsString()
  @IsOptional()
  readonly description?: string | null;

  @Field(() => Int)
  @IsInt()
  readonly assetId: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  readonly intervalDays: number;

  @Field()
  @IsDateString()
  readonly nextDueAt: string;
}
