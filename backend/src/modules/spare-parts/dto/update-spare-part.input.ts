// ─────────────────────── Imports ────────────────────────
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsNumber, IsOptional, IsString, Min } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class UpdateSparePartInput {
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
