import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import { GET_SLA_BREACHES } from '../../graphql/dashboard/GetSlaBreaches.gql'
import { GET_STOCK_REPORT } from '../../graphql/dashboard/GetStockReport.gql'
import type { DashboardFilterInput, GetSlaBreachesData, GetStockReportData } from '../../graphql/dashboard/types'
import { splitHours } from '../../lib/period'
import { formatWorkOrderCode } from '../../lib/work-order-labels'
import Badge from '../ui/Badge'
import { SheetSection } from '../ui/Sheet'
import Skeleton from '../ui/Skeleton'

const MAX_ITEMS = 5

interface AttentionListProps {
  readonly title: string
  readonly count: number
  readonly loading: boolean
  readonly emptyMessage: string
  readonly moreHref: string
  readonly children: ReactNode
}

function AttentionList({ title, count, loading, emptyMessage, moreHref, children }: AttentionListProps) {
  return (
    <section aria-label={title} className="flex min-w-0 flex-col">
      <header className="flex items-center justify-between gap-3 px-5 py-2.5">
        <h3 className="flex items-center gap-2 text-sm font-medium text-ink">
          {title}
          {count > 0 && <Badge variant="error">{count}</Badge>}
        </h3>
        {count > MAX_ITEMS && (
          <Link to={moreHref} className="text-xs">
            Ver todas
          </Link>
        )}
      </header>
      {loading ? (
        <div className="flex flex-col gap-2 px-5 pb-4">
          <Skeleton />
          <Skeleton className="w-2/3" />
        </div>
      ) : count === 0 ? (
        <p className="px-5 pb-4 text-sm text-faint">{emptyMessage}</p>
      ) : (
        <ul className="border-t border-rule">{children}</ul>
      )}
    </section>
  )
}

function Row({ to, children }: { readonly to: string; readonly children: ReactNode }) {
  return (
    <li className="border-b border-rule last:border-b-0">
      <Link to={to} className="flex items-center gap-3 px-5 py-2 text-sm text-ink hover:bg-subtle hover:no-underline">
        {children}
      </Link>
    </li>
  )
}

interface AttentionPanelProps {
  readonly filter: DashboardFilterInput
  /** Query string dos filtros, repassada aos links "Ver todas". */
  readonly search: string
}

/** O que pede ação: estoque abaixo do mínimo (agora) e OS que começaram fora do SLA (no período). */
export default function AttentionPanel({ filter, search }: AttentionPanelProps) {
  const stock = useQuery<GetStockReportData>(GET_STOCK_REPORT, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })
  const sla = useQuery<GetSlaBreachesData>(GET_SLA_BREACHES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })

  const lowStock = (stock.data?.stockReport ?? [])
    .filter((r) => r.belowMinimum)
    .sort((a, b) => b.minimumStock - b.quantity - (a.minimumStock - a.quantity))
  const breaches = [...(sla.data?.slaBreaches ?? [])].sort((a, b) => b.delayHours - a.delayHours)

  return (
    <SheetSection title="Atenção" flush>
      <div className="grid border-t border-rule lg:grid-cols-2 lg:divide-x lg:divide-rule max-lg:[&>*:first-child]:border-b max-lg:[&>*:first-child]:border-rule">
        <AttentionList
          title="Estoque abaixo do mínimo"
          count={lowStock.length}
          loading={stock.loading && !stock.data}
          emptyMessage="Nenhuma peça abaixo do mínimo."
          moreHref={`/dashboard/reports/stock${search}`}
        >
          {lowStock.slice(0, MAX_ITEMS).map((r) => (
            <Row key={r.sparePartId} to={`/dashboard/spare-parts/${r.sparePartId}/edit`}>
              <span className="w-24 shrink-0 font-mono text-[0.8125rem]">{r.partNumber}</span>
              <span className="min-w-0 flex-1 truncate">{r.name}</span>
              <span className="shrink-0 font-mono text-xs tabular-nums">
                <span className="font-semibold text-error">{r.quantity}</span>
                <span className="text-quiet"> / mín. {r.minimumStock}</span>
              </span>
            </Row>
          ))}
        </AttentionList>

        <AttentionList
          title="Iniciadas fora do SLA no período"
          count={breaches.length}
          loading={sla.loading && !sla.data}
          emptyMessage="Nenhuma OS do período começou fora do prazo."
          moreHref={`/dashboard/reports/sla${search}`}
        >
          {breaches.slice(0, MAX_ITEMS).map((b) => {
            const delay = splitHours(b.delayHours)
            return (
              <Row key={b.workOrderId} to={`/dashboard/work-orders/${b.workOrderId}`}>
                <span className="w-20 shrink-0 font-mono text-[0.8125rem]">{formatWorkOrderCode(b.workOrderId)}</span>
                <span className="min-w-0 flex-1 truncate">{b.title}</span>
                <span className="shrink-0 font-mono text-xs font-semibold tabular-nums text-error">
                  +{delay.value} {delay.unit}
                </span>
              </Row>
            )
          })}
        </AttentionList>
      </div>
    </SheetSection>
  )
}
