// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsInt, IsOptional, IsPositive } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class DashboardFilterInput {
  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly assetId?: number;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly from?: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly to?: Date;
}
