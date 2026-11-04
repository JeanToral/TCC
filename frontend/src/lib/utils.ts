import { CombinedGraphQLErrors } from '@apollo/client'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Mensagem para o usuário a partir de um erro do Apollo 4: a primeira mensagem
 * do servidor (ex.: "E-mail já cadastrado"); fora isso, `networkFallback` ou a
 * mensagem do próprio erro.
 */
export function errorMessage(err: unknown, networkFallback?: string): string {
  if (CombinedGraphQLErrors.is(err)) {
    return err.errors[0]?.message ?? networkFallback ?? err.message
  }
  if (networkFallback) return networkFallback
  return err instanceof Error && err.message ? err.message : 'Erro inesperado.'
}

/** Marcas redondas para o eixo: 0, 1 mil, 2 mil… em vez de 850, 1,7 mil, 2,6 mil. */
export function niceTicks(max: number, count = 4): number[] {
  if (max <= 0) return [0]
  const raw = max / count
  const magnitude = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * magnitude).find((candidate) => candidate >= raw) ?? raw
  const ticks = [0]
  while (ticks[ticks.length - 1] < max) ticks.push(ticks[ticks.length - 1] + step)
  return ticks
}

/** Corta o texto em `max` caracteres, terminando em reticências. */
export function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text
}
