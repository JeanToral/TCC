import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

@InputType()
export class UpdateRoleInput {
  @Field({ nullable: true })
  @Trim()
  @IsNotEmpty()
  @IsOptional()
  @IsString()
  @MinLength(1)
  readonly name?: string;

  @Field(() => String, { nullable: true })
  @Trim({ emptyToNull: true })
  @IsOptional()
  @IsString()
  readonly description?: string | null;

  @Field(() => [String], { nullable: true })
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  readonly permissions?: string[];
}
