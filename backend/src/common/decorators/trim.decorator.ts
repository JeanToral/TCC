// ─────────────────────── Imports ────────────────────────
import { Transform } from 'class-transformer';

// ─────────────────────── Decorator ──────────────────────
export interface TrimOptions {
  /**
   * Texto em branco vira `null`. Para campos anuláveis no banco: grava ausência
   * em vez de string vazia e, no update, permite limpar o campo.
   */
  readonly emptyToNull?: boolean;
}

/**
 * Remove espaços nas pontas antes da validação. Sem `emptyToNull`, "   " vira ""
 * e cai no `@IsNotEmpty`/`@MinLength` do campo.
 */
export function Trim({
  emptyToNull = false,
}: TrimOptions = {}): PropertyDecorator {
  return Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return emptyToNull && trimmed === '' ? null : trimmed;
  });
}
