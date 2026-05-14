// ─────────────────────── Imports ────────────────────────
import { Field, InputType } from '@nestjs/graphql';
import { IsOptional, MaxLength, MinLength } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class UpdateAssetInput {
  @Field({ nullable: true })
  @IsOptional()
  @MinLength(1)
  @MaxLength(200)
  readonly name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MinLength(1)
  @MaxLength(100)
  readonly tag?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(200)
  readonly location?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(200)
  readonly manufacturer?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(200)
  readonly model?: string;

  @Field({ nullable: true })
  @IsOptional()
  @MaxLength(100)
  readonly serialNumber?: string;

  @Field({ nullable: true })
  @IsOptional()
  readonly installDate?: Date;
}
