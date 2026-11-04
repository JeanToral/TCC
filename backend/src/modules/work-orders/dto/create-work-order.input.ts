// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEnum, IsInt, IsNotEmpty, IsPositive, MaxLength } from 'class-validator';
import { Priority, WorkOrderType as WorkOrderTypeEnum } from '../../../generated/prisma';
import { Trim } from '../../../common/decorators/trim.decorator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CreateWorkOrderInput {
  @Field()
  @Trim()
  @IsNotEmpty()
  @MaxLength(200)
  readonly title: string;

  @Field()
  @Trim()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly description: string;

  @Field(() => WorkOrderTypeEnum)
  @IsEnum(WorkOrderTypeEnum)
  readonly type: WorkOrderTypeEnum;

  @Field(() => Priority)
  @IsEnum(Priority)
  readonly priority: Priority;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  readonly assetId: number;
}
