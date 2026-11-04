// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class UpdatePreventivePlanInput {
  @Field({ nullable: true })
  @Trim()
  @IsNotEmpty()
  @IsString()
  @IsOptional()
  readonly name?: string;

  @Field(() => String, { nullable: true })
  @Trim({ emptyToNull: true })
  @IsString()
  @IsOptional()
  readonly description?: string | null;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(1)
  @IsOptional()
  readonly intervalDays?: number;

  @Field({ nullable: true })
  @IsDateString()
  @IsOptional()
  readonly nextDueAt?: string;

  @Field({ nullable: true })
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;
}
