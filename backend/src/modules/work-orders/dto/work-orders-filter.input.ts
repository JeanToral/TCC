// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { Type } from 'class-transformer';
import { IsDate, IsEnum, IsInt, IsOptional, IsPositive } from 'class-validator';
import { WorkOrderStatus } from '../../../generated/prisma';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class WorkOrdersFilterInput {
  @Field(() => WorkOrderStatus, { nullable: true })
  @IsOptional()
  @IsEnum(WorkOrderStatus)
  readonly status?: WorkOrderStatus;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly assetId?: number;

  @Field(() => Int, { nullable: true })
  @IsOptional()
  @IsInt()
  @IsPositive()
  readonly assignedToId?: number;

  /** Abertas a partir de (createdAt). */
  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly from?: Date;

  /** Abertas até (createdAt). */
  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly to?: Date;
}
