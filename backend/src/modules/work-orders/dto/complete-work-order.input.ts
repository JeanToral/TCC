// ─────────────────────── Imports ────────────────────────
import { Field, Float, InputType } from '@nestjs/graphql';
import { IsNotEmpty, IsNumber, IsOptional, Max, MaxLength, Min } from 'class-validator';

// ─────────────────────── Input ───────────────────────────
@InputType()
export class CompleteWorkOrderInput {
  @Field()
  @IsNotEmpty()
  @MaxLength(2000)
  readonly closingNotes: string;

  /**
   * Horas efetivamente trabalhadas. É uma quantidade, não um valor monetário —
   * por isso pode ser informada por quem não tem permissão de ver custo.
   * Não confundir com tempo de parada (completedAt − startedAt).
   */
  @Field(() => Float, { nullable: true })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(999)
  readonly laborHours?: number;
}
