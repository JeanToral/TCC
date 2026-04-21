// ─────────────────────── Imports ────────────────────────
import { Field, InputType, Int } from '@nestjs/graphql';
import { IsEmail, IsInt, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

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
}
