import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';

@InputType()
export class CreateRoleInput {
  @Field()
  @IsString()
  @MinLength(1)
  readonly name: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  readonly description?: string;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  readonly permissions: string[];
}
