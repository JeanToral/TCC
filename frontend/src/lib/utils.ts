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
