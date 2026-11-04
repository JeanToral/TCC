import {
  addHours,
  differenceInCalendarDays,
  endOfDay,
  endOfMonth,
  format,
  isSameDay,
  startOfDay,
  startOfHour,
  startOfMinute,
  startOfMonth,
  subDays,
  subMonths,
} from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import type { DateRange } from 'react-day-picker'

import { niceTicks } from './utils'

/** Dashboard e Relatórios abrem nos últimos 6 meses, com o mês corrente inteiro. */
export const DEFAULT_PERIOD_MONTHS = 6

export interface PeriodFilter {
  readonly from?: string
  readonly to?: string
}

export function defaultDateRange(now: Date = new Date()): DateRange {
  return { from: startOfMonth(subMonths(now, DEFAULT_PERIOD_MONTHS - 1)), to: now }
}

/**
 * O calendário devolve a meia-noite do dia escolhido; o fim do intervalo vai
 * até o último instante desse dia para não deixar o dia final de fora.
 */
export function toPeriodFilter(range: DateRange | undefined): PeriodFilter {
  return {
    ...(range?.from ? { from: startOfDay(range.from).toISOString() } : {}),
    ...(range?.to ? { to: endOfDay(range.to).toISOString() } : {}),
  }
}

/**
 * O intervalo de mesma duração imediatamente antes — base do comparativo do
 * Dashboard. 01/05–31/05 (31 dias) → 31/03–30/04.
 */
export function previousPeriod(range: DateRange): DateRange | undefined {
  if (!range.from || !range.to) return undefined
  const days = differenceInCalendarDays(range.to, range.from) + 1
  return { from: subDays(range.from, days), to: subDays(range.from, 1) }
}

/**
 * Meses que o período toca sem cobrir inteiros, com o trecho coberto —
 * `{ '2026-10' → 'até 24/10' }`. A barra desse mês não é comparável às outras.
 */
export function partialMonths(filter: PeriodFilter): ReadonlyMap<string, string> {
  const partial = new Map<string, string>()
  if (!filter.from || !filter.to) return partial
  const from = new Date(filter.from)
  const to = new Date(filter.to)
  const day = (d: Date) => format(d, 'dd/MM')
  const key = (d: Date) => format(d, 'yyyy-MM')
  const startsLate = from.getTime() > startOfMonth(from).getTime()
  const endsEarly = endOfDay(to).getTime() < endOfMonth(to).getTime()

  if (key(from) === key(to)) {
    if (startsLate || endsEarly) partial.set(key(from), `de ${day(from)} a ${day(to)}`)
    return partial
  }
  if (startsLate) partial.set(key(from), `desde ${day(from)}`)
  if (endsEarly) partial.set(key(to), `até ${day(to)}`)
  return partial
}

/** Nota de rodapé dos meses parciais: `* Mês parcial: out/26 até 24/10.` */
export function partialMonthsNote(partial: ReadonlyMap<string, string>): string | undefined {
  if (partial.size === 0) return undefined
  const parts = [...partial].map(([month, range]) => `${formatMonth(month)} ${range}`)
  return `* ${partial.size > 1 ? 'Meses parciais' : 'Mês parcial'}: ${parts.join('; ')}.`
}

/** `2026-05` → `mai/26`. */
export function formatMonth(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return format(new Date(year, month - 1, 1), 'MMM/yy', { locale: ptBR })
}

/** `2026-05` → `maio de 2026` — para tooltip e tabela. */
export function formatMonthLong(key: string): string {
  const [year, month] = key.split('-').map(Number)
  return format(new Date(year, month - 1, 1), "MMMM 'de' yyyy", { locale: ptBR })
}

const HOURS = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })
const HOURS_FIXED = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
const AXIS_NUMBER = new Intl.NumberFormat('pt-BR')

/** Duração em horas, na maior unidade legível, com vírgula: `45 min`, `4,4 h`, `44,6 d`. */
export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)} min`
  if (hours < 24) return `${HOURS_FIXED.format(hours)} h`
  return `${HOURS_FIXED.format(hours / 24)} d`
}

/**
 * Eixo de horas em marcas redondas na unidade que cabe: minutos abaixo de 1 h,
 * horas até 48 h, dias acima. Evita rótulos repetidos como "0 min, 0 min, 1 min".
 */
export function hoursAxis(maxHours: number): { readonly ticks: number[]; readonly format: (hours: number) => string } {
  if (maxHours < 1) {
    return {
      ticks: niceTicks(maxHours * 60).map((minutes) => minutes / 60),
      format: (h) => (h === 0 ? '0' : `${Math.round(h * 60)} min`),
    }
  }
  if (maxHours < 48) {
    return { ticks: niceTicks(maxHours), format: (h) => (h === 0 ? '0' : `${AXIS_NUMBER.format(h)} h`) }
  }
  return {
    ticks: niceTicks(maxHours / 24).map((days) => days * 24),
    format: (h) => (h === 0 ? '0' : `${AXIS_NUMBER.format(h / 24)} d`),
  }
}

/** Horas → valor e unidade separados, para mostrador: `4,3` `h`; a partir de 48 h, em dias. */
export function splitHours(hours: number | null): { readonly value: string | null; readonly unit: 'h' | 'd' } {
  if (hours === null) return { value: null, unit: 'h' }
  return hours >= 48 ? { value: HOURS.format(hours / 24), unit: 'd' } : { value: HOURS.format(hours), unit: 'h' }
}

// ── Datas de dia (sem hora) ────────────────────────────────
/**
 * Data sem hora vai ao backend ao meio-dia local: meia-noite viraria o dia
 * anterior em UTC−3 (`01/10 00:00Z` = 30/09 21h em São Paulo).
 */
export function atLocalNoon(day: Date): Date {
  const noon = new Date(day)
  noon.setHours(12, 0, 0, 0)
  return noon
}

/**
 * Lê uma data de dia vinda do backend pelo dia em UTC — vale para as gravadas
 * ao meio-dia local (15h UTC) e para as antigas, gravadas à meia-noite UTC.
 */
export function parseDayValue(iso: string): Date {
  const date = new Date(iso)
  return new Date(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

const DAY = new Intl.DateTimeFormat('pt-BR')

/** Data de dia (vencimento, instalação) em `dd/mm/aaaa`, pelo mesmo critério de `parseDayValue`. */
export function formatDay(iso: string): string {
  return DAY.format(parseDayValue(iso))
}

/** Dia já passou (antes de hoje). O próprio dia de hoje não conta como atraso. */
export function isPastDay(iso: string, now: Date = new Date()): boolean {
  return parseDayValue(iso) < startOfDay(now)
}

// ── Agendamento ───────────────────────────────────────────
/** Hoje: a próxima hora cheia. Outro dia: 08:00, começo do turno. */
export function defaultScheduleStart(day: Date, now: Date = new Date()): Date {
  if (isSameDay(day, now)) return startOfHour(addHours(now, 1))
  const start = new Date(day)
  start.setHours(8, 0, 0, 0)
  return start
}

/** No dia do início: uma hora depois dele. Em outro dia: o mesmo horário do início. */
export function defaultScheduleEnd(day: Date, start: Date | undefined): Date {
  if (start && isSameDay(day, start)) return addHours(start, 1)
  const end = new Date(day)
  end.setHours(start?.getHours() ?? 8, start?.getMinutes() ?? 0, 0, 0)
  return end
}

export interface ScheduleErrors {
  readonly start?: string
  readonly end?: string
}

export function validateSchedule(
  start: Date | undefined,
  end: Date | undefined,
  now: Date = new Date(),
): ScheduleErrors {
  return {
    ...(start && start < startOfMinute(now) ? { start: 'Início previsto não pode estar no passado.' } : {}),
    ...(start && end && end < start ? { end: 'Fim previsto não pode ser antes do início.' } : {}),
  }
}
