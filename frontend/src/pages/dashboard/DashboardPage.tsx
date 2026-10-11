import { useState } from 'react'
import { useQuery } from '@apollo/client/react'
import type { DateRange } from 'react-day-picker'

import { NativeSelect } from '../../components/ui/select'
import { DateRangePicker } from '../../components/ui/date-range-picker'
import Spinner from '../../components/ui/Spinner'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import { GET_DASHBOARD_SLA_RATE } from '../../graphql/dashboard/GetDashboardSlaRate.gql'
import type { AssetKpi, DashboardFilterInput, GetDashboardKpisData, GetDashboardSlaRateData } from '../../graphql/dashboard/types'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { GetAssetsData } from '../../graphql/assets/types'
import { useAuth } from '../../contexts/AuthContext'
import { defaultDateRange, formatHours, toPeriodFilter } from '../../lib/period'
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

interface AssetKpiRowProps {
  readonly kpi: AssetKpi
}

function AssetKpiRow({ kpi }: AssetKpiRowProps) {
  return (
    <tr className="kpi-table__row">
      <td className="kpi-table__cell kpi-table__cell--name">{kpi.assetName}</td>
      <td className="kpi-table__cell kpi-table__cell--metric">
        {formatHours(kpi.mttr)}
      </td>
      <td className="kpi-table__cell kpi-table__cell--metric">
        {formatHours(kpi.mtbf)}
      </td>
      <td className="kpi-table__cell kpi-table__cell--count">{kpi.completedWorkOrders}</td>
      <td className="kpi-table__cell kpi-table__cell--count">{kpi.totalWorkOrders}</td>
    </tr>
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
  const [initialRange] = useState<DateRange>(() => defaultDateRange())
  const [assetId, setAssetId] = useState<number | undefined>(undefined)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(initialRange)

  const filter: DashboardFilterInput = {
    ...(assetId !== undefined ? { assetId } : {}),
    ...toPeriodFilter(dateRange),
  }

  const { data, loading, error } = useQuery<GetDashboardKpisData>(GET_DASHBOARD_KPIS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })

  const { data: slaData } = useQuery<GetDashboardSlaRateData>(GET_DASHBOARD_SLA_RATE, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })

  const isFiltered = assetId !== undefined || dateRange !== initialRange

  const { data: assetsData } = useQuery<GetAssetsData>(GET_ASSETS, {
    fetchPolicy: 'cache-first',
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

      {/* ── Filtros ─────────────────────────────────── */}
      <div className="dashboard-filters">
        <NativeSelect
          id="filter-asset"
          label="Ativo"
          className="dashboard-filters__select"
          value={assetId ?? ''}
          onChange={(e) =>
            setAssetId(e.target.value ? Number(e.target.value) : undefined)
          }
        >
          <option value="">Todos os ativos</option>
          {(assetsData?.assets ?? []).map((a) => (
            <option key={a.id} value={a.id}>
              {a.name} ({a.tag})
            </option>
          ))}
        </NativeSelect>

        <DateRangePicker
          label="Período"
          value={dateRange}
          onSelect={setDateRange}
          placeholder="Selecionar intervalo"
        />

        {isFiltered && (
          <button
            type="button"
            className="dashboard-filters__clear"
            onClick={() => {
              setAssetId(undefined)
              setDateRange(initialRange)
            }}
          >
            Restaurar padrão
          </button>
        )}
      </div>

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
          <KpiCard
            label="OEE"
            value="—"
            subtitle="Em breve"
          />
        </div>
      )}

      {/* ── Estados ─────────────────────────────────── */}
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

      {/* ── Gráficos ────────────────────────────────── */}
      <DashboardCharts
        filter={filter}
        kpis={kpis}
        kpisLoading={loading}
        canReadCost={hasPermission('cost.read')}
      />

      {/* ── Tabela por ativo ────────────────────────── */}
      {kpis.length > 0 && (
        <div className="kpi-table-card">
          <table className="kpi-table">
            <thead>
              <tr>
                <th className="kpi-table__th">Ativo</th>
                <th className="kpi-table__th kpi-table__th--metric">
                  MTTR
                  <span className="kpi-table__th-hint">Tempo médio de reparo</span>
                </th>
                <th className="kpi-table__th kpi-table__th--metric">
                  MTBF
                  <span className="kpi-table__th-hint">Tempo médio entre falhas</span>
                </th>
                <th className="kpi-table__th kpi-table__th--count">OS concluídas</th>
                <th className="kpi-table__th kpi-table__th--count">OS totais</th>
              </tr>
            </thead>
            <tbody>
              {kpis.map((kpi) => (
                <AssetKpiRow key={kpi.assetId} kpi={kpi} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
