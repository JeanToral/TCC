import { Field, InputType } from '@nestjs/graphql';
import { IsArray, IsOptional, IsString, MinLength } from 'class-validator';
import { Trim } from '../../../common/decorators/trim.decorator';

@InputType()
export class CreateRoleInput {
  @Field()
  @Trim()
  @IsString()
  @MinLength(1)
  readonly name: string;

  @Field(() => String, { nullable: true })
  @Trim({ emptyToNull: true })
  @IsOptional()
  @IsString()
  readonly description?: string | null;

  @Field(() => [String])
  @IsArray()
  @IsString({ each: true })
  readonly permissions: string[];
}
