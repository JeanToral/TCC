// ─────────────────────── Imports ────────────────────────
import { Field, InputType } from '@nestjs/graphql';
import { IsEmail, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
/**
 * Autoedição: só nome e e-mail. Papel, status, taxa horária e senha ficam de
 * fora de propósito — não existem no tipo, então o GraphQL rejeita na validação.
 */
@InputType()
export class UpdateMyProfileInput {
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name?: string;

  @Field({ nullable: true })
  @IsOptional()
  @IsEmail()
  email?: string;

  /** Obrigatória só quando o e-mail muda: o e-mail é o login. */
  @Field({ nullable: true })
  @IsOptional()
  @IsString()
  @MaxLength(200)
  currentPassword?: string;
}
