import { useCallback, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, isValid, parse } from 'date-fns'
import type { DateRange } from 'react-day-picker'

import type { DashboardFilterInput } from '../graphql/dashboard/types'
import { defaultDateRange, toPeriodFilter } from '../lib/period'

const DAY_FORMAT = 'yyyy-MM-dd'

export interface ReportFilters {
  readonly assetId: number | undefined
  readonly dateRange: DateRange
  /** Pronto para as queries: ativo + período (fim do último dia incluído). */
  readonly filter: DashboardFilterInput
  /** Query string atual (`?assetId=…&from=…&to=…`), para links que levam o recorte. */
  readonly search: string
  readonly isDefault: boolean
  readonly setAssetId: (assetId: number | undefined) => void
  readonly setDateRange: (range: DateRange | undefined) => void
  readonly reset: () => void
}

function parseDay(value: string | null): Date | undefined {
  if (!value) return undefined
  const date = parse(value, DAY_FORMAT, new Date())
  return isValid(date) ? date : undefined
}

function parseAssetId(value: string | null): number | undefined {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : undefined
}

/**
 * Filtros de Dashboard e Relatórios guardados na URL — o link do relatório
 * pode ser compartilhado e o "Ver relatório →" leva o mesmo recorte.
 * Sem `from`/`to` na URL vale o padrão: últimos 6 meses.
 */
export function useReportFilters(): ReportFilters {
  const [searchParams, setSearchParams] = useSearchParams()
  const [fallbackRange] = useState<DateRange>(() => defaultDateRange())

  const assetId = parseAssetId(searchParams.get('assetId'))
  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const urlRange = useMemo<DateRange | undefined>(() => {
    const from = parseDay(fromParam)
    const to = parseDay(toParam)
    return from && to ? { from, to } : undefined
  }, [fromParam, toParam])

  const hasPeriod = urlRange !== undefined
  const dateRange = urlRange ?? fallbackRange

  const filter = useMemo<DashboardFilterInput>(
    () => ({ ...(assetId !== undefined ? { assetId } : {}), ...toPeriodFilter(dateRange) }),
    [assetId, dateRange],
  )

  const update = useCallback(
    (mutate: (params: URLSearchParams) => void) => {
      setSearchParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          mutate(next)
          return next
        },
        { replace: true },
      )
    },
    [setSearchParams],
  )

  const setAssetId = useCallback(
    (id: number | undefined) =>
      update((p) => (id === undefined ? p.delete('assetId') : p.set('assetId', String(id)))),
    [update],
  )

  /** Intervalo incompleto (só o início clicado) é ignorado: ainda não filtra. */
  const setDateRange = useCallback(
    (range: DateRange | undefined) => {
      const start = range?.from
      const end = range?.to
      if (!start || !end) return
      update((p) => {
        p.set('from', format(start, DAY_FORMAT))
        p.set('to', format(end, DAY_FORMAT))
      })
    },
    [update],
  )

  const reset = useCallback(
    () =>
      update((p) => {
        p.delete('assetId')
        p.delete('from')
        p.delete('to')
      }),
    [update],
  )

  const query = searchParams.toString()

  return {
    assetId,
    dateRange,
    filter,
    search: query ? `?${query}` : '',
    isDefault: assetId === undefined && !hasPeriod,
    setAssetId,
    setDateRange,
    reset,
  }
}
