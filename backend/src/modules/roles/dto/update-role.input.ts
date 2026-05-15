import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class UpdateRoleInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(1)
  readonly name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly permissions?: string[];
}
