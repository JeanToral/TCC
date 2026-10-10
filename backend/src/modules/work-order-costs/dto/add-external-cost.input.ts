// ─────────────────────── Imports ────────────────────────
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsDate,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  MaxLength,
} from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class AddExternalCostInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  readonly workOrderId: number;

  @Field()
  @IsString()
  @IsNotEmpty()
  @MaxLength(300)
  readonly description: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  readonly supplier?: string;

  @Field(() => Float)
  @IsNumber()
  @IsPositive()
  readonly amount: number;

  /** Competência do custo — não necessariamente a data de lançamento. */
  @Field()
  @IsDate()
  readonly incurredAt: Date;
}
