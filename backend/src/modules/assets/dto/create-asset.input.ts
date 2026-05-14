// ─────────────────────── Imports ────────────────────────
import { Field, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsOptional, MaxLength } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CreateAssetInput {
  @Field()
  @IsNotEmpty()
  @MaxLength(200)
  readonly name: string;

  @Field()
  @IsNotEmpty()
  @MaxLength(100)
  readonly tag: string;

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
