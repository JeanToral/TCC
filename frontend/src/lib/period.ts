import { endOfDay, format, startOfDay, startOfMonth, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale/pt-BR'
import type { DateRange } from 'react-day-picker'

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

/** Duração em horas, na maior unidade legível: `45min`, `4.4h`, `44.6d`. */
export function formatHours(hours: number | null): string {
  if (hours === null) return '—'
  if (hours < 1) return `${Math.round(hours * 60)}min`
  if (hours < 24) return `${hours.toFixed(1)}h`
  return `${(hours / 24).toFixed(1)}d`
}
