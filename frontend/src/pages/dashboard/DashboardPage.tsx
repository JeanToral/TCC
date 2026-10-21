import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import AttentionPanel from '../../components/dashboard/AttentionPanel'
import ReportFilters from '../../components/reports/ReportFilters'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import Readout, { ReadoutStrip } from '../../components/ui/Readout'
import { Sheet, SheetHeader, SheetSection } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import { GET_DASHBOARD_SLA_RATE } from '../../graphql/dashboard/GetDashboardSlaRate.gql'
import type {
  AssetKpi,
  DashboardFilterInput,
  GetDashboardKpisData,
  GetDashboardSlaRateData,
} from '../../graphql/dashboard/types'
import { useReportFilters } from '../../hooks/useReportFilters'
import { previousPeriod, splitHours, toPeriodFilter } from '../../lib/period'
import { cn } from '../../lib/utils'
import DashboardCharts from './DashboardCharts'

interface Summary {
  readonly avgMttr: number | null
  readonly avgMtbf: number | null
  readonly totalCompleted: number
  readonly assetCount: number
  readonly slaPercentage: number | null
  readonly slaWithin: number
  readonly slaTotal: number
}

function average(values: readonly number[]): number | null {
  return values.length > 0 ? values.reduce((sum, v) => sum + v, 0) / values.length : null
}

function summarize(kpis: readonly AssetKpi[] | undefined, sla: GetDashboardSlaRateData | undefined): Summary {
  const rows = kpis ?? []
  const rate = sla?.dashboardSlaRate
  return {
    avgMttr: average(rows.flatMap((k) => (k.mttr === null ? [] : [k.mttr]))),
    avgMtbf: average(rows.flatMap((k) => (k.mtbf === null ? [] : [k.mtbf]))),
    totalCompleted: rows.reduce((sum, k) => sum + k.completedWorkOrders, 0),
    assetCount: rows.length,
    slaPercentage: rate && rate.total > 0 ? rate.percentage : null,
    slaWithin: rate?.withinSla ?? 0,
    slaTotal: rate?.total ?? 0,
  }
}

/** KPIs e % de SLA de um recorte — o mesmo par de queries serve ao período atual e ao anterior. */
function useSummary(filter: DashboardFilterInput, skip: boolean) {
  const kpis = useQuery<GetDashboardKpisData>(GET_DASHBOARD_KPIS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
    skip,
  })
  const sla = useQuery<GetDashboardSlaRateData>(GET_DASHBOARD_SLA_RATE, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
    skip,
  })
  return {
    summary: summarize(kpis.data?.dashboardKpis, sla.data),
    kpis: kpis.data?.dashboardKpis ?? [],
    loading: kpis.loading,
    error: kpis.error ?? sla.error,
  }
}

const NUMBER = new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 1 })

interface DeltaProps {
  readonly current: number | null
  readonly previous: number | null
  /** Qual direção é melhora. `neutral` só informa a variação. */
  readonly better: 'lower' | 'higher' | 'neutral'
  readonly format: (value: number) => string
}

/** "▼ 0,8 h vs. período anterior" — verde quando melhora, vermelho quando piora. */
function Delta({ current, previous, better, format }: DeltaProps) {
  if (current === null || previous === null) return <span>Sem base no período anterior</span>
  const diff = current - previous
  if (Math.abs(diff) < 0.05) return <span>Igual ao período anterior</span>

  const improved = better === 'neutral' ? null : better === 'lower' ? diff < 0 : diff > 0
  return (
    <span>
      <span
        className={cn(
          'font-mono font-medium',
          improved === true && 'text-success',
          improved === false && 'text-error',
        )}
      >
        {diff > 0 ? '▲' : '▼'} {format(Math.abs(diff))}
      </span>{' '}
      vs. período anterior
    </span>
  )
}

function formatDuration(hours: number): string {
  const { value, unit } = splitHours(hours)
  return `${value} ${unit}`
}

export default function DashboardPage() {
  const { hasPermission } = useAuth()
  const filters = useReportFilters()
  const { filter, dateRange } = filters

  const previousFilter = useMemo<DashboardFilterInput>(
    () => ({
      ...(filter.assetId !== undefined ? { assetId: filter.assetId } : {}),
      ...toPeriodFilter(previousPeriod(dateRange)),
    }),
    [filter.assetId, dateRange],
  )

  const canRead = hasPermission('dashboard.read')
  const current = useSummary(filter, !canRead)
  const previous = useSummary(previousFilter, !canRead)

  if (!canRead) {
    return (
      <Sheet>
        <SheetHeader eyebrow="Análise" title="Dashboard" />
        <EmptyState
          message="Os indicadores ficam com gestores e engenheiros. Suas ordens de serviço estão na lista de OS."
          action={<Link to="/dashboard/work-orders">Ver ordens de serviço</Link>}
        />
      </Sheet>
    )
  }

  const s = current.summary
  const p = previous.summary
  const mttr = splitHours(s.avgMttr)
  const mtbf = splitHours(s.avgMtbf)

  return (
    <Sheet>
      <SheetHeader eyebrow="Quadro de turno" title="Dashboard" actions={<ReportFilters filters={filters} />} />

      {current.error && <FormAlert className="mb-5">Erro ao carregar dados: {current.error.message}</FormAlert>}

      <SheetSection title="Indicadores do período" flush>
        <ReadoutStrip className="border-t border-rule">
          <Readout
            label="MTTR médio"
            value={mttr.value}
            unit={mttr.unit}
            detail={<Delta current={s.avgMttr} previous={p.avgMttr} better="lower" format={formatDuration} />}
          />
          <Readout
            label="MTBF médio"
            value={mtbf.value}
            unit={mtbf.unit}
            detail={<Delta current={s.avgMtbf} previous={p.avgMtbf} better="higher" format={formatDuration} />}
          />
          <Readout
            label="Dentro do SLA"
            value={s.slaPercentage === null ? null : NUMBER.format(s.slaPercentage)}
            unit="%"
            detail={
              s.slaTotal > 0 ? (
                <>
                  {s.slaWithin} de {s.slaTotal} OS no prazo ·{' '}
                  <Delta
                    current={s.slaPercentage}
                    previous={p.slaPercentage}
                    better="higher"
                    format={(v) => `${NUMBER.format(v)} p.p.`}
                  />
                </>
              ) : (
                'Sem OS concluídas no período'
              )
            }
          />
          <Readout
            label="Corretivas concluídas"
            value={String(s.totalCompleted)}
            detail={
              <Delta
                current={s.totalCompleted}
                previous={p.totalCompleted}
                better="neutral"
                format={(v) => NUMBER.format(v)}
              />
            }
          />
        </ReadoutStrip>
        <p className="border-t border-rule px-5 py-2 text-xs text-faint">
          OEE ainda não calculado: Performance e Qualidade não são registradas no sistema.
        </p>
      </SheetSection>

      <AttentionPanel filter={filter} search={filters.search} />

      <DashboardCharts
        filter={filter}
        kpis={current.kpis}
        kpisLoading={current.loading}
        canReadCost={hasPermission('cost.read')}
        search={filters.search}
      />
    </Sheet>
  )
}
