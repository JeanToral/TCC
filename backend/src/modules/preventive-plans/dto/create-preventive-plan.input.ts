// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDateString, IsInt, IsNotEmpty, IsOptional, IsString, Min } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CreatePreventivePlanInput {
  @Field()
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @Field({ nullable: true })
  @IsString()
  @IsOptional()
  readonly description?: string;

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
