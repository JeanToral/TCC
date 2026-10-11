// ─────────────────────── Imports ────────────────────────
import { BadRequestException } from '@nestjs/common';

// ─────────────────────── Constants ──────────────────────
/**
 * Séries mensais agrupam no fuso da planta, não em UTC: uma OS concluída às
 * 23h do dia 31 pertence ao mês 31, não ao seguinte. São Paulo não tem horário
 * de verão desde 2019, então o deslocamento é fixo.
 */
export const REPORT_TIME_ZONE = 'America/Sao_Paulo';
const REPORT_UTC_OFFSET = '-03:00';

export const DEFAULT_PERIOD_MONTHS = 6;
export const MAX_PERIOD_MONTHS = 36;

const MONTH_FORMAT = new Intl.DateTimeFormat('en-CA', {
  timeZone: REPORT_TIME_ZONE,
  year: 'numeric',
  month: '2-digit',
});

// ─────────────────────── Types ───────────────────────────
export interface ReportPeriod {
  readonly from: Date;
  readonly to: Date;
}

// ─────────────────────── Helpers ─────────────────────────
/** Mês da data no fuso da planta, no formato `YYYY-MM`. */
export function monthKey(date: Date): string {
  const parts = MONTH_FORMAT.formatToParts(date);
  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  return `${year}-${month}`;
}

function shiftMonth(key: string, delta: number): string {
  const [year, month] = key.split('-').map(Number);
  const index = year * 12 + (month - 1) + delta;
  const y = Math.floor(index / 12);
  const m = (index % 12) + 1;
  return `${y}-${String(m).padStart(2, '0')}`;
}

function startOfMonth(key: string): Date {
  return new Date(`${key}-01T00:00:00${REPORT_UTC_OFFSET}`);
}

/** Todos os meses de `from` a `to`, inclusive, em ordem — meses vazios incluídos. */
export function monthKeysBetween(from: Date, to: Date): string[] {
  const last = monthKey(to);
  const keys: string[] = [];
  for (let key = monthKey(from); key <= last; key = shiftMonth(key, 1)) {
    keys.push(key);
  }
  return keys;
}

/**
 * Período padrão: os últimos 6 meses, contando o mês corrente inteiro desde o
 * dia 1º. Rejeita intervalo invertido ou longo demais para virar série mensal.
 */
export function resolvePeriod(
  from?: Date,
  to?: Date,
  now: Date = new Date(),
): ReportPeriod {
  const end = to ?? now;
  const start =
    from ?? startOfMonth(shiftMonth(monthKey(end), -(DEFAULT_PERIOD_MONTHS - 1)));

  if (start.getTime() > end.getTime()) {
    throw new BadRequestException('O início do período deve ser anterior ao fim');
  }
  if (monthKeysBetween(start, end).length > MAX_PERIOD_MONTHS) {
    throw new BadRequestException(
      `O período pode ter no máximo ${MAX_PERIOD_MONTHS} meses`,
    );
  }

  return { from: start, to: end };
}
