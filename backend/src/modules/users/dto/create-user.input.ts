// ─────────────────────── Imports ────────────────────────
import { Field, Float, InputType, Int } from '@nestjs/graphql';
import {
  IsEmail,
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CreateUserInput {
  @Field()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @Field()
  @IsEmail()
  email: string;

  @Field()
  @IsString()
  @MinLength(8)
  password: string;

  @Field(() => Int)
  @IsInt()
  @IsPositive()
  roleId: number;

  /** Taxa horária. Só aceita de quem tem cost.manage — validado no service. */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(100000)
  hourlyRate?: number;
}
