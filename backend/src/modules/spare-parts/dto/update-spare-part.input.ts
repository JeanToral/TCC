// ─────────────────────── Imports ────────────────────────
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class UpdateSparePartInput {
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
  @Min(0)
  @IsOptional()
  readonly quantity?: number;

  @Field(() => Int, { nullable: true })
  @IsInt()
  @Min(0)
  @IsOptional()
  readonly minimumStock?: number;

  @Field(() => Float, { nullable: true })
  @IsNumber()
  @Min(0)
  @IsOptional()
  readonly unitCost?: number;
}
