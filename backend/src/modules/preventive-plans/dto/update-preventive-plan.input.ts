// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsBoolean, IsDateString, IsInt, IsOptional, IsString, Min } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class UpdatePreventivePlanInput {
  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  readonly name?: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  readonly description?: string;

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
