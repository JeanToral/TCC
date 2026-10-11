import { useQuery } from '@apollo/client/react'
import {
  Bar,
  BarChart,
  CartesianGrid,
  LabelList,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

import { ChartCard, ChartTooltip, type LegendItem } from '../../components/charts/ChartCard'
import { GET_DASHBOARD_MONTHLY_TREND } from '../../graphql/dashboard/GetDashboardMonthlyTrend.gql'
import { GET_DASHBOARD_STATUS_COUNTS } from '../../graphql/dashboard/GetDashboardStatusCounts.gql'
import type {
  AssetKpi,
  DashboardFilterInput,
  GetDashboardMonthlyTrendData,
  GetDashboardStatusCountsData,
} from '../../graphql/dashboard/types'
import { GET_MONTHLY_COSTS } from '../../graphql/finance/GetMonthlyCosts.gql'
import type { GetMonthlyCostsData } from '../../graphql/finance/types'
import type { WorkOrderStatus } from '../../graphql/work-orders/types'
import { formatHours, formatMonth, formatMonthLong } from '../../lib/period'

// ── Aparência compartilhada (cores vêm dos tokens do tema) ──
const SERIES_1 = 'var(--chart-1)'
const SERIES_2 = 'var(--chart-2)'
const TICK = { fill: 'var(--text-muted)', fontSize: '0.75rem' }
const GRID = { stroke: 'var(--chart-grid)' }
const AXIS_LINE = { stroke: 'var(--chart-axis)' }
const BAR_CURSOR = { fill: 'var(--surface-subtle)' }
const LINE_CURSOR = { stroke: 'var(--chart-axis)', strokeWidth: 1 }
/** O "respiro" de 2px entre barras e segmentos é o próprio fundo do cartão. */
const BAR_GAP = { stroke: 'var(--surface-white)', strokeWidth: 2 }
const BAR_SIZE = 24
const MARGIN = { top: 8, right: 12, bottom: 0, left: 0 }

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprovada',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
}

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const BRL_COMPACT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
})
const INTEGER = new Intl.NumberFormat('pt-BR')

const formatCount = (value: number) => INTEGER.format(value)
const formatPercent = (value: number) => `${value}%`

const OPEN_VS_DONE: readonly LegendItem[] = [
  { label: 'Abertas', color: SERIES_1, shape: 'line' },
  { label: 'Concluídas', color: SERIES_2, shape: 'line' },
]

const BY_TYPE: readonly LegendItem[] = [
  { label: 'Preventiva', color: SERIES_1, shape: 'bar' },
  { label: 'Corretiva', color: SERIES_2, shape: 'bar' },
]

// ── Componente ────────────────────────────────────────────
export interface DashboardChartsProps {
  readonly filter: DashboardFilterInput
  readonly kpis: readonly AssetKpi[]
  readonly kpisLoading: boolean
  readonly canReadCost: boolean
}

export default function DashboardCharts({
  filter,
  kpis,
  kpisLoading,
  canReadCost,
}: DashboardChartsProps) {
  const variables = { filter }

  const statusQuery = useQuery<GetDashboardStatusCountsData>(GET_DASHBOARD_STATUS_COUNTS, {
    variables,
    fetchPolicy: 'cache-and-network',
  })
  const trendQuery = useQuery<GetDashboardMonthlyTrendData>(GET_DASHBOARD_MONTHLY_TREND, {
    variables,
    fetchPolicy: 'cache-and-network',
  })
  const costQuery = useQuery<GetMonthlyCostsData>(GET_MONTHLY_COSTS, {
    variables,
    skip: !canReadCost,
    fetchPolicy: 'cache-and-network',
  })

  const statusData = (statusQuery.data?.dashboardStatusCounts ?? []).map((s) => ({
    label: STATUS_LABELS[s.status],
    count: s.count,
  }))
  const statusTotal = statusData.reduce((sum, s) => sum + s.count, 0)

  const trend = trendQuery.data?.dashboardMonthlyTrend ?? []
  const trendHasOpenOrDone = trend.some((p) => p.opened > 0 || p.completed > 0)
  const trendHasSla = trend.some((p) => p.slaPercentage !== null)

  const mttrTop = kpis
    .filter((k): k is AssetKpi & { mttr: number } => k.mttr !== null)
    .sort((a, b) => b.mttr - a.mttr)
    .slice(0, 10)
    .map((k) => ({ label: k.assetName, mttr: k.mttr }))

  const costs = costQuery.data?.monthlyCosts ?? []
  const costHasValue = costs.some((p) => p.total > 0)
  const incompleteCost = costs.reduce((sum, p) => sum + p.workOrdersWithIncompleteCost, 0)

  return (
    <div className="dashboard-charts">
      {/* 1 — Onde está o gargalo do fluxo? */}
      <ChartCard
        title="OS por status"
        subtitle="Situação atual das OS abertas no período"
        loading={statusQuery.loading}
        error={statusQuery.error?.message}
        isEmpty={statusTotal === 0}
        emptyMessage="Nenhuma OS aberta no período."
        table={{
          headers: ['Status', 'OS'],
          rows: statusData.map((s) => [s.label, formatCount(s.count)]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={statusData} layout="vertical" margin={{ ...MARGIN, right: 32 }}>
            <CartesianGrid horizontal={false} {...GRID} />
            <XAxis type="number" allowDecimals={false} tick={TICK} axisLine={false} tickLine={false} />
            <YAxis
              type="category"
              dataKey="label"
              width={104}
              tick={TICK}
              axisLine={AXIS_LINE}
              tickLine={false}
            />
            <Tooltip
              cursor={BAR_CURSOR}
              content={(props) => <ChartTooltip {...props} formatValue={formatCount} />}
            />
            <Bar dataKey="count" name="OS" fill={SERIES_1} maxBarSize={BAR_SIZE} radius={[0, 4, 4, 0]}>
              <LabelList dataKey="count" position="right" fill="var(--text-secondary)" fontSize="0.75rem" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 2 — O backlog está crescendo? */}
      <ChartCard
        title="Abertas × concluídas por mês"
        subtitle="Abertas pela data de criação; concluídas pela data de conclusão"
        legend={OPEN_VS_DONE}
        loading={trendQuery.loading}
        error={trendQuery.error?.message}
        isEmpty={!trendHasOpenOrDone}
        emptyMessage="Nenhuma OS aberta ou concluída no período."
        table={{
          headers: ['Mês', 'Abertas', 'Concluídas'],
          rows: trend.map((p) => [formatMonthLong(p.month), formatCount(p.opened), formatCount(p.completed)]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={MARGIN}>
            <CartesianGrid vertical={false} {...GRID} />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} axisLine={AXIS_LINE} tickLine={false} />
            <YAxis allowDecimals={false} width={36} tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={LINE_CURSOR}
              content={(props) => (
                <ChartTooltip {...props} shape="line" formatLabel={formatMonthLong} formatValue={formatCount} />
              )}
            />
            <SeriesLine dataKey="opened" name="Abertas" color={SERIES_1} />
            <SeriesLine dataKey="completed" name="Concluídas" color={SERIES_2} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 3 — Estamos saindo do reativo? */}
      <ChartCard
        title="Corretiva × preventiva por mês"
        subtitle="OS concluídas, pela data de conclusão"
        legend={BY_TYPE}
        loading={trendQuery.loading}
        error={trendQuery.error?.message}
        isEmpty={!trend.some((p) => p.completed > 0)}
        emptyMessage="Nenhuma OS concluída no período."
        table={{
          headers: ['Mês', 'Preventiva', 'Corretiva'],
          rows: trend.map((p) => [
            formatMonthLong(p.month),
            formatCount(p.completedPreventive),
            formatCount(p.completedCorrective),
          ]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={trend} margin={MARGIN}>
            <CartesianGrid vertical={false} {...GRID} />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} axisLine={AXIS_LINE} tickLine={false} />
            <YAxis allowDecimals={false} width={36} tick={TICK} axisLine={false} tickLine={false} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={(props) => (
                <ChartTooltip {...props} formatLabel={formatMonthLong} formatValue={formatCount} />
              )}
            />
            <Bar dataKey="completedPreventive" name="Preventiva" stackId="type" fill={SERIES_1} maxBarSize={BAR_SIZE} {...BAR_GAP} />
            <Bar dataKey="completedCorrective" name="Corretiva" stackId="type" fill={SERIES_2} maxBarSize={BAR_SIZE} radius={[4, 4, 0, 0]} {...BAR_GAP} />
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 4 — O prazo está melhorando? */}
      <ChartCard
        title="% dentro do SLA por mês"
        subtitle="OS concluídas que começaram dentro do prazo da prioridade"
        loading={trendQuery.loading}
        error={trendQuery.error?.message}
        isEmpty={!trendHasSla}
        emptyMessage="Nenhuma OS concluída com início registrado no período."
        table={{
          headers: ['Mês', '% no prazo', 'OS no prazo', 'OS avaliadas'],
          rows: trend.map((p) => [
            formatMonthLong(p.month),
            p.slaPercentage === null ? '—' : formatPercent(p.slaPercentage),
            formatCount(p.slaWithin),
            formatCount(p.slaTotal),
          ]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={trend} margin={MARGIN}>
            <CartesianGrid vertical={false} {...GRID} />
            <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} axisLine={AXIS_LINE} tickLine={false} />
            <YAxis
              domain={[0, 100]}
              ticks={[0, 25, 50, 75, 100]}
              tickFormatter={formatPercent}
              width={44}
              tick={TICK}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              cursor={LINE_CURSOR}
              content={(props) => (
                <ChartTooltip {...props} shape="line" formatLabel={formatMonthLong} formatValue={formatPercent} />
              )}
            />
            <SeriesLine dataKey="slaPercentage" name="% no prazo" color={SERIES_1} />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 5 — Quais máquinas demoram mais a voltar? */}
      <ChartCard
        title="Ativos com maior MTTR"
        subtitle="Tempo médio de reparo das corretivas concluídas — top 10"
        loading={kpisLoading}
        isEmpty={mttrTop.length === 0}
        emptyMessage="Nenhuma OS corretiva concluída no período."
        table={{
          headers: ['Ativo', 'MTTR'],
          rows: mttrTop.map((k) => [k.label, formatHours(k.mttr)]),
        }}
      >
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={mttrTop} layout="vertical" margin={{ ...MARGIN, right: 48 }}>
            <CartesianGrid horizontal={false} {...GRID} />
            <XAxis type="number" tickFormatter={(h: number) => (h === 0 ? '0' : formatHours(h))} tick={TICK} axisLine={false} tickLine={false} />
            <YAxis type="category" dataKey="label" width={136} tick={TICK} axisLine={AXIS_LINE} tickLine={false} />
            <Tooltip
              cursor={BAR_CURSOR}
              content={(props) => <ChartTooltip {...props} formatValue={formatHours} />}
            />
            <Bar dataKey="mttr" name="MTTR" fill={SERIES_1} maxBarSize={BAR_SIZE} radius={[0, 4, 4, 0]}>
              <LabelList
                dataKey="mttr"
                position="right"
                fill="var(--text-secondary)"
                fontSize="0.75rem"
                formatter={(v: unknown) => (typeof v === 'number' ? formatHours(v) : '')}
              />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>

      {/* 6 — Quanto o reativo custa? */}
      {canReadCost && (
        <ChartCard
          title="Custo realizado por mês"
          subtitle="Peças e mão de obra pela conclusão; serviços externos pela competência"
          legend={BY_TYPE}
          loading={costQuery.loading}
          error={costQuery.error?.message}
          isEmpty={!costHasValue}
          emptyMessage="Nenhum custo realizado no período."
          footnote={
            incompleteCost > 0
              ? `${incompleteCost} OS sem preço de peça ou taxa horária — contadas como zero.`
              : undefined
          }
          table={{
            headers: ['Mês', 'Preventiva', 'Corretiva', 'Total'],
            rows: costs.map((p) => [
              formatMonthLong(p.month),
              BRL.format(p.preventive),
              BRL.format(p.corrective),
              BRL.format(p.total),
            ]),
          }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={costs} margin={MARGIN}>
              <CartesianGrid vertical={false} {...GRID} />
              <XAxis dataKey="month" tickFormatter={formatMonth} tick={TICK} axisLine={AXIS_LINE} tickLine={false} />
              <YAxis
                tickFormatter={(v: number) => BRL_COMPACT.format(v)}
                width={72}
                tick={TICK}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                cursor={BAR_CURSOR}
                content={(props) => (
                  <ChartTooltip {...props} formatLabel={formatMonthLong} formatValue={(v) => BRL.format(v)} />
                )}
              />
              <Bar dataKey="preventive" name="Preventiva" stackId="cost" fill={SERIES_1} maxBarSize={BAR_SIZE} {...BAR_GAP} />
              <Bar dataKey="corrective" name="Corretiva" stackId="cost" fill={SERIES_2} maxBarSize={BAR_SIZE} radius={[4, 4, 0, 0]} {...BAR_GAP} />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      )}
    </div>
  )
}

// ── Linha de série (2px, marcadores com anel na cor do fundo) ──
interface SeriesLineProps {
  readonly dataKey: string
  readonly name: string
  readonly color: string
}

function SeriesLine({ dataKey, name, color }: SeriesLineProps) {
  return (
    <Line
      type="linear"
      dataKey={dataKey}
      name={name}
      stroke={color}
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      dot={{ r: 4, fill: color, stroke: 'var(--surface-white)', strokeWidth: 2 }}
      activeDot={{ r: 5, fill: color, stroke: 'var(--surface-white)', strokeWidth: 2 }}
    />
  )
}
