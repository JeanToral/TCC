// ─────────────────────── Imports ────────────────────────
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CreateSparePartInput {
  @Field()
  @Trim()
  @IsString()
  @IsNotEmpty()
  readonly name: string;

  @Field()
  @Trim()
  @IsString()
  @IsNotEmpty()
  readonly partNumber: string;

  @Field(() => String, { nullable: true })
  @Trim({ emptyToNull: true })
  @IsString()
  @IsOptional()
  readonly description?: string | null;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  readonly quantity: number = 0;

  @Field(() => Int, { defaultValue: 0 })
  @IsInt()
  @Min(0)
  @IsOptional()
  readonly minimumStock: number = 0;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  readonly unitCost?: number;
}
