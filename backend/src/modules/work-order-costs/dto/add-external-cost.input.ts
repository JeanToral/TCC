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
import { Trim } from '../../../common/decorators/trim.decorator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class AddExternalCostInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  readonly workOrderId: number;

  @Field()
  @Trim()
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
