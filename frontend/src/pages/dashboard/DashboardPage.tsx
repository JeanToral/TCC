import { useQuery } from '@apollo/client/react'

import ReportFilters from '../../components/reports/ReportFilters'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import { GET_DASHBOARD_SLA_RATE } from '../../graphql/dashboard/GetDashboardSlaRate.gql'
import type { AssetKpi, GetDashboardKpisData, GetDashboardSlaRateData } from '../../graphql/dashboard/types'
import { useReportFilters } from '../../hooks/useReportFilters'
import { formatHours } from '../../lib/period'
import DashboardCharts from './DashboardCharts'
import './DashboardPage.css'

interface KpiCardProps {
  readonly label: string
  readonly value: string
  readonly subtitle: string
  readonly variant?: 'default' | 'highlight'
}

function KpiCard({ label, value, subtitle, variant = 'default' }: KpiCardProps) {
  return (
    <div className={`kpi-card kpi-card--${variant}`}>
      <span className="kpi-card__label">{label}</span>
      <span className="kpi-card__value">{value}</span>
      <span className="kpi-card__subtitle">{subtitle}</span>
    </div>
  )
}

function computeSummary(kpis: readonly AssetKpi[]) {
  const withMttr = kpis.filter((k) => k.mttr !== null)
  const withMtbf = kpis.filter((k) => k.mtbf !== null)

  const avgMttr =
    withMttr.length > 0
      ? withMttr.reduce((sum, k) => sum + (k.mttr ?? 0), 0) / withMttr.length
      : null

  const avgMtbf =
    withMtbf.length > 0
      ? withMtbf.reduce((sum, k) => sum + (k.mtbf ?? 0), 0) / withMtbf.length
      : null

  const totalCompleted = kpis.reduce((sum, k) => sum + k.completedWorkOrders, 0)

  return { avgMttr, avgMtbf, totalCompleted, assetCount: kpis.length }
}

export default function DashboardPage() {
  const { hasPermission } = useAuth()
  const filters = useReportFilters()
  const { filter } = filters

  const { data, loading, error } = useQuery<GetDashboardKpisData>(GET_DASHBOARD_KPIS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })

  const { data: slaData } = useQuery<GetDashboardSlaRateData>(GET_DASHBOARD_SLA_RATE, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })

  const kpis = data?.dashboardKpis ?? []
  const summary = computeSummary(kpis)
  const slaRate = slaData?.dashboardSlaRate

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Dashboard</h1>
          <span className="page-header__count">KPIs de Manutenção</span>
        </div>
      </header>

      <ReportFilters filters={filters} />

      {/* ── Cards de resumo ──────────────────────────── */}
      {(kpis.length > 0 || slaRate !== undefined) && (
        <div className="kpi-summary">
          <KpiCard
            label="MTTR médio"
            value={formatHours(summary.avgMttr)}
            subtitle="Tempo médio de reparo"
            variant="highlight"
          />
          <KpiCard
            label="MTBF médio"
            value={formatHours(summary.avgMtbf)}
            subtitle="Tempo médio entre falhas"
            variant="highlight"
          />
          <KpiCard
            label="OS corretivas concluídas"
            value={String(summary.totalCompleted)}
            subtitle={`em ${summary.assetCount} ${summary.assetCount === 1 ? 'ativo' : 'ativos'}`}
          />
          <KpiCard
            label="% dentro do SLA"
            value={slaRate !== undefined && slaRate.total > 0 ? `${slaRate.percentage}%` : '—'}
            subtitle={
              slaRate !== undefined && slaRate.total > 0
                ? `${slaRate.withinSla} de ${slaRate.total} OS no prazo`
                : 'Sem OS concluídas no período'
            }
            variant="highlight"
          />
          <KpiCard label="OEE" value="—" subtitle="Em breve" />
        </div>
      )}

      {loading && !data && !slaData && (
        <div className="page-loading">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="page-error" role="alert">
          Erro ao carregar dados: {error.message}
        </div>
      )}

      <DashboardCharts
        filter={filter}
        kpis={kpis}
        kpisLoading={loading}
        canReadCost={hasPermission('cost.read')}
        search={filters.search}
      />
    </div>
  )
}
