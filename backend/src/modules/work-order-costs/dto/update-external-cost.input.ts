// ─────────────────────── Imports ────────────────────────
import { Field, Float, InputType } from '@nestjs/graphql';
import {
  IsDate,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class UpdateExternalCostInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  readonly description?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly supplier?: string;

  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @IsPositive()
  readonly amount?: number;

  @Field({ nullable: true })
  @IsOptional()
  @IsDate()
  readonly incurredAt?: Date;
}
