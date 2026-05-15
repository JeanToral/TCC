import { Field, InputType, Int } from '@nestjs/graphql';
import { IsInt, IsOptional, IsString, Min } from 'class-validator';

export function encodeCursor(id: number): string {
  return Buffer.from(String(id)).toString('base64');
}

export function decodeCursor(cursor: string): number {
  return parseInt(Buffer.from(cursor, 'base64').toString('utf8'), 10);
}

@InputType()
export class PageArgs {
  @Field(() => Int, { nullable: true, defaultValue: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  readonly first?: number;

  @Field(() => String, { nullable: true })
  @IsOptional()
  @IsString()
  readonly after?: string;
}
