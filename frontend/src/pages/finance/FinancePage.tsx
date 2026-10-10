import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'
import type { DateRange } from 'react-day-picker'

import { NativeSelect } from '../../components/ui/select'
import { DateRangePicker } from '../../components/ui/date-range-picker'
import Spinner from '../../components/ui/Spinner'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { GetAssetsData } from '../../graphql/assets/types'
import { GET_ASSET_COSTS } from '../../graphql/finance/GetAssetCosts.gql'
import type { AssetCost, GetAssetCostsData } from '../../graphql/finance/types'
import './FinancePage.css'

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

// ── SummaryCard ────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  hint,
}: {
  readonly label: string
  readonly value: string
  readonly hint?: string
}) {
  return (
    <div className="finance-card">
      <span className="finance-card__label">{label}</span>
      <strong className="finance-card__value">{value}</strong>
      {hint && <span className="finance-card__hint">{hint}</span>}
    </div>
  )
}

// ── FinancePage ────────────────────────────────────────────
export default function FinancePage() {
  // Permite chegar filtrado a partir da tela do ativo (?assetId=3).
  const [searchParams] = useSearchParams()
  const initialAssetId = Number(searchParams.get('assetId')) || undefined

  const [assetId, setAssetId] = useState<number | undefined>(initialAssetId)
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined)

  const filter = useMemo(
    () => ({
      ...(assetId !== undefined ? { assetId } : {}),
      ...(dateRange?.from ? { from: dateRange.from.toISOString() } : {}),
      ...(dateRange?.to ? { to: dateRange.to.toISOString() } : {}),
    }),
    [assetId, dateRange],
  )

  const { data: assetsData } = useQuery<GetAssetsData>(GET_ASSETS)

  const { data, loading, error } = useQuery<GetAssetCostsData>(GET_ASSET_COSTS, {
    variables: { filter },
  })

  const rows = data?.assetCosts ?? []
  const totals = sumTotals(rows)
  const assets = assetsData?.assets ?? []
  const hasFilter = assetId !== undefined || !!dateRange?.from || !!dateRange?.to

  return (
    <div className="finance-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Custos por Ativo</h1>
        </div>
      </header>

      {/* ── Filtros ───────────────────────────────────── */}
      <div className="finance-filters">
        <NativeSelect
          id="finance-asset"
          label="Ativo"
          value={assetId !== undefined ? String(assetId) : ''}
          onChange={(e) => setAssetId(e.target.value ? Number(e.target.value) : undefined)}
        >
          <option value="">Todos os ativos</option>
          {assets.map((a) => (
            <option key={a.id} value={String(a.id)}>
              {a.tag} — {a.name}
            </option>
          ))}
        </NativeSelect>

        <DateRangePicker
          label="Período"
          value={dateRange}
          onSelect={setDateRange}
          placeholder="Selecionar intervalo"
        />

        {hasFilter && (
          <button
            type="button"
            className="finance-filters__clear"
            onClick={() => {
              setAssetId(undefined)
              setDateRange(undefined)
            }}
          >
            Limpar filtros
          </button>
        )}
      </div>

      {error && (
        <div className="page-error" role="alert">
          {error.message}
        </div>
      )}

      {loading ? (
        <div className="page-loading">
          <Spinner size="lg" />
        </div>
      ) : (
        <>
          {/* ── Cobertura ───────────────────────────── */}
          {totals.incomplete > 0 && (
            <p className="finance-coverage" role="status">
              {money(totals.realized)} — <strong>{totals.incomplete}</strong> de{' '}
              {totals.completed} OS com custo incompleto. Faltou preço de peça ou
              taxa horária; o total subestima o gasto real.
            </p>
          )}

          {/* ── Resumo ──────────────────────────────── */}
          <div className="finance-cards">
            <SummaryCard label="Custo realizado" value={money(totals.realized)} />
            <SummaryCard
              label="Custo previsto"
              value={money(totals.forecast)}
              hint="OS abertas, a preços atuais — estimativa"
            />
            <SummaryCard
              label="Corretiva"
              value={money(totals.corrective)}
              hint={`${percent(totals.corrective, totals.realized)} do realizado`}
            />
            <SummaryCard
              label="Preventiva"
              value={money(totals.preventive)}
              hint={`${percent(totals.preventive, totals.realized)} do realizado`}
            />
          </div>

          {/* ── Tabela ──────────────────────────────── */}
          {rows.length === 0 ? (
            <p className="finance-empty">
              Nenhum custo registrado no período selecionado.
            </p>
          ) : (
            <div className="finance-table-wrap">
              <table className="finance-table">
                <thead>
                  <tr>
                    <th>Ativo</th>
                    <th className="finance-table__num">Peças</th>
                    <th className="finance-table__num">Mão de obra</th>
                    <th className="finance-table__num">Externos</th>
                    <th className="finance-table__num">Realizado</th>
                    <th className="finance-table__num">Corretiva</th>
                    <th className="finance-table__num">Preventiva</th>
                    <th className="finance-table__num">Previsto</th>
                    <th className="finance-table__num">OS</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.assetId}>
                      <td>
                        <Link to={`/dashboard/assets/${row.assetId}`} className="finance-table__asset">
                          <strong>{row.assetTag}</strong>
                          <span>{row.assetName}</span>
                        </Link>
                      </td>
                      <td className="finance-table__num">{money(row.realizedPartsCost)}</td>
                      <td className="finance-table__num">{money(row.realizedLaborCost)}</td>
                      <td className="finance-table__num">{money(row.realizedExternalCost)}</td>
                      <td className="finance-table__num finance-table__num--strong">
                        {money(row.realizedTotal)}
                      </td>
                      <td className="finance-table__num">{money(row.realizedCorrectiveCost)}</td>
                      <td className="finance-table__num">{money(row.realizedPreventiveCost)}</td>
                      <td className="finance-table__num finance-table__num--muted">
                        {money(row.forecastTotal)}
                      </td>
                      <td className="finance-table__num">
                        {row.completedWorkOrders}
                        {row.workOrdersWithIncompleteCost > 0 && (
                          <span
                            className="finance-table__flag"
                            title={`${row.workOrdersWithIncompleteCost} OS com custo incompleto`}
                          >
                            !
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <th>Total</th>
                    <td className="finance-table__num">{money(totals.parts)}</td>
                    <td className="finance-table__num">{money(totals.labor)}</td>
                    <td className="finance-table__num">{money(totals.external)}</td>
                    <td className="finance-table__num finance-table__num--strong">
                      {money(totals.realized)}
                    </td>
                    <td className="finance-table__num">{money(totals.corrective)}</td>
                    <td className="finance-table__num">{money(totals.preventive)}</td>
                    <td className="finance-table__num finance-table__num--muted">
                      {money(totals.forecast)}
                    </td>
                    <td className="finance-table__num">{totals.completed}</td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  )
}
