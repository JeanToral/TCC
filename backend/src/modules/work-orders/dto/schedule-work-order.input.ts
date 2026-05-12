// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsDate, IsInt, IsOptional, IsPositive } from 'class-validator';
import { Type } from 'class-transformer';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class ScheduleWorkOrderInput {
  @Field(() => Int)
  @IsInt()
  @IsPositive()
  readonly assignedToId: number;

  @Field()
  @Type(() => Date)
  @IsDate()
  readonly scheduledStart: Date;

  @Field({ nullable: true })
  @IsOptional()
  @Type(() => Date)
  @IsDate()
  readonly scheduledEnd?: Date;
}
