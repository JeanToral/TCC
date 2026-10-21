import { useQuery } from '@apollo/client/react'

import { ChartGrid } from '../../components/charts/ChartCard'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import Readout, { ReadoutStrip } from '../../components/ui/Readout'
import { SheetSection } from '../../components/ui/Sheet'
import type { DashboardFilterInput } from '../../graphql/dashboard/types'
import { GET_ASSET_COSTS } from '../../graphql/finance/GetAssetCosts.gql'
import type { AssetCost, GetAssetCostsData } from '../../graphql/finance/types'
import { CostTrendChart } from '../dashboard/DashboardCharts'

// ── Helpers ────────────────────────────────────────────────
const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

function money(value: number): string {
  return BRL.format(value)
}

function percent(part: number, whole: number): string {
  if (whole <= 0) return '—'
  return `${Math.round((part / whole) * 100)}%`
}

interface Totals {
  readonly parts: number
  readonly labor: number
  readonly external: number
  readonly realized: number
  readonly corrective: number
  readonly preventive: number
  readonly forecast: number
  readonly completed: number
  readonly incomplete: number
}

function sumTotals(rows: readonly AssetCost[]): Totals {
  return rows.reduce<Totals>(
    (acc, row) => ({
      parts: acc.parts + row.realizedPartsCost,
      labor: acc.labor + row.realizedLaborCost,
      external: acc.external + row.realizedExternalCost,
      realized: acc.realized + row.realizedTotal,
      corrective: acc.corrective + row.realizedCorrectiveCost,
      preventive: acc.preventive + row.realizedPreventiveCost,
      forecast: acc.forecast + row.forecastTotal,
      completed: acc.completed + row.completedWorkOrders,
      incomplete: acc.incomplete + row.workOrdersWithIncompleteCost,
    }),
    {
      parts: 0,
      labor: 0,
      external: 0,
      realized: 0,
      corrective: 0,
      preventive: 0,
      forecast: 0,
      completed: 0,
      incomplete: 0,
    },
  )
}

// ── Colunas ────────────────────────────────────────────────
const COLUMNS: readonly DataTableColumn<AssetCost>[] = [
  {
    key: 'asset',
    header: 'Ativo',
    link: true,
    mobile: 'title',
    cell: (row) => (
      <span className="flex flex-col">
        <span className="font-mono font-medium">{row.assetTag}</span>
        <span className="text-xs text-quiet max-sm:hidden">{row.assetName}</span>
      </span>
    ),
  },
  { key: 'parts', header: 'Peças', align: 'right', mobile: 'hidden', cell: (r) => money(r.realizedPartsCost) },
  { key: 'labor', header: 'Mão de obra', align: 'right', mobile: 'hidden', cell: (r) => money(r.realizedLaborCost) },
  { key: 'external', header: 'Externos', align: 'right', mobile: 'hidden', cell: (r) => money(r.realizedExternalCost) },
  {
    key: 'realized',
    header: 'Realizado',
    align: 'right',
    cell: (r) => <span className="font-semibold">{money(r.realizedTotal)}</span>,
  },
  { key: 'corrective', header: 'Corretiva', align: 'right', mobile: 'hidden', cell: (r) => money(r.realizedCorrectiveCost) },
  { key: 'preventive', header: 'Preventiva', align: 'right', mobile: 'hidden', cell: (r) => money(r.realizedPreventiveCost) },
  { key: 'forecast', header: 'Previsto', align: 'right', cell: (r) => <span className="text-quiet">{money(r.forecastTotal)}</span> },
  {
    key: 'wos',
    header: 'OS',
    align: 'right',
    cell: (r) => (
      <span className="inline-flex items-center gap-1.5">
        {r.workOrdersWithIncompleteCost > 0 && (
          <span
            className="inline-flex size-4 items-center justify-center rounded-xs bg-warning-soft font-sans text-[0.625rem] font-bold text-[var(--warning-text)]"
            title={`${r.workOrdersWithIncompleteCost} OS com custo incompleto`}
          >
            !
          </span>
        )}
        {r.completedWorkOrders}
      </span>
    ),
  },
]

// ── CostsReport ────────────────────────────────────────────
interface ReportTabProps {
  readonly filter: DashboardFilterInput
}

export default function CostsReport({ filter }: ReportTabProps) {
  const { data, loading, error } = useQuery<GetAssetCostsData>(GET_ASSET_COSTS, {
    variables: { filter },
  })

  const rows = data?.assetCosts ?? []
  const totals = sumTotals(rows)

  return (
    <>
      <ChartGrid>
        <CostTrendChart filter={filter} />
      </ChartGrid>

      {error && <FormAlert className="mb-5">{error.message}</FormAlert>}

      <SheetSection title="Resumo do período" flush>
        {totals.incomplete > 0 && (
          <p
            className="mx-5 mb-3 border-l-[3px] border-warning bg-warning-soft px-3 py-2 text-sm text-[var(--warning-text)]"
            role="status"
          >
            {money(totals.realized)} — <strong>{totals.incomplete}</strong> de {totals.completed} OS com custo
            incompleto. Faltou preço de peça ou taxa horária; o total subestima o gasto real.
          </p>
        )}
        <ReadoutStrip className="border-t border-rule">
          <Readout label="Custo realizado" value={loading ? null : money(totals.realized)} />
          <Readout label="Custo previsto" value={loading ? null : money(totals.forecast)} detail="OS abertas, a preços atuais — estimativa" />
          <Readout
            label="Corretiva"
            value={loading ? null : money(totals.corrective)}
            detail={`${percent(totals.corrective, totals.realized)} do realizado`}
          />
          <Readout
            label="Preventiva"
            value={loading ? null : money(totals.preventive)}
            detail={`${percent(totals.preventive, totals.realized)} do realizado`}
          />
        </ReadoutStrip>
      </SheetSection>

      <SheetSection title="Custo por ativo" flush>
        <DataTable
          label="Custo por ativo"
          columns={COLUMNS}
          rows={rows}
          getRowKey={(r) => r.assetId}
          rowHref={(r) => `/dashboard/assets/${r.assetId}`}
          loading={loading}
          empty={<EmptyState message="Nenhum custo registrado no período selecionado." />}
          footer={[
            'Total',
            money(totals.parts),
            money(totals.labor),
            money(totals.external),
            money(totals.realized),
            money(totals.corrective),
            money(totals.preventive),
            money(totals.forecast),
            totals.completed,
          ]}
        />
      </SheetSection>
    </>
  )
}
