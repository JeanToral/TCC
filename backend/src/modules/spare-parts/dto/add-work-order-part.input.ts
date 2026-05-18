// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, Min } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class AddWorkOrderPartInput {
  @Field(() => Int)
  @IsInt()
  readonly workOrderId: number;

  @Field(() => Int)
  @IsInt()
  readonly sparePartId: number;

  @Field(() => Int)
  @IsInt()
  @Min(1)
  readonly quantityUsed: number;
}
