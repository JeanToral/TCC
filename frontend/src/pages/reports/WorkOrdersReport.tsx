import { useState } from 'react'
import { useQuery } from '@apollo/client/react'

import { ChartGrid } from '../../components/charts/ChartCard'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import PriorityMark from '../../components/ui/PriorityMark'
import { SheetSection } from '../../components/ui/Sheet'
import type { DashboardFilterInput } from '../../graphql/dashboard/types'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type { GetWorkOrdersData, WorkOrderListItem } from '../../graphql/work-orders/types'
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANT,
  WORK_ORDER_TYPE_LABELS,
  formatWorkOrderCode,
} from '../../lib/work-order-labels'
import { OpenedCompletedChart, StatusChart, TypeMixChart } from '../dashboard/DashboardCharts'

const PAGE_SIZE = 50
const DATE = new Intl.DateTimeFormat('pt-BR')

const COLUMNS: readonly DataTableColumn<WorkOrderListItem>[] = [
  {
    key: 'code',
    header: 'Nº',
    link: true,
    className: 'w-24',
    cell: (wo) => <span className="font-mono font-medium">{formatWorkOrderCode(wo.id)}</span>,
  },
  { key: 'title', header: 'Título', mobile: 'title', cell: (wo) => wo.title },
  { key: 'asset', header: 'Ativo', cell: (wo) => <span className="font-mono text-[0.8125rem]">{wo.asset.tag}</span> },
  { key: 'type', header: 'Tipo', mobile: 'hidden', cell: (wo) => WORK_ORDER_TYPE_LABELS[wo.type] },
  { key: 'priority', header: 'Prioridade', cell: (wo) => <PriorityMark priority={wo.priority} /> },
  {
    key: 'status',
    header: 'Situação',
    cell: (wo) => <Badge variant={WORK_ORDER_STATUS_VARIANT[wo.status]}>{WORK_ORDER_STATUS_LABELS[wo.status]}</Badge>,
  },
  {
    key: 'created',
    header: 'Aberta em',
    align: 'right',
    mobile: 'hidden',
    cell: (wo) => <span className="font-mono text-quiet">{DATE.format(new Date(wo.createdAt))}</span>,
  },
]

interface ReportTabProps {
  readonly filter: DashboardFilterInput
}

export default function WorkOrdersReport({ filter }: ReportTabProps) {
  const [loadingMore, setLoadingMore] = useState(false)
  const { data, loading, error, fetchMore } = useQuery<GetWorkOrdersData>(GET_WORK_ORDERS, {
    variables: { first: PAGE_SIZE, filter },
    fetchPolicy: 'cache-and-network',
  })

  const connection = data?.workOrders
  const rows: readonly WorkOrderListItem[] = connection?.edges.map((e) => e.node) ?? []
  const endCursor = connection?.pageInfo.endCursor ?? null

  function handleLoadMore() {
    if (!endCursor || loadingMore) return
    setLoadingMore(true)
    void fetchMore({
      variables: { first: PAGE_SIZE, after: endCursor, filter },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev
        return {
          workOrders: {
            edges: [...prev.workOrders.edges, ...fetchMoreResult.workOrders.edges],
            pageInfo: fetchMoreResult.workOrders.pageInfo,
          },
        }
      },
    }).finally(() => setLoadingMore(false))
  }

  return (
    <>
      <ChartGrid>
        <StatusChart filter={filter} />
        <OpenedCompletedChart filter={filter} />
        <TypeMixChart filter={filter} />
      </ChartGrid>

      <SheetSection title="Ordens de serviço abertas no período" flush>
        {error ? (
          <FormAlert className="mb-5">{error.message}</FormAlert>
        ) : (
          <DataTable
            label="Ordens de serviço do período"
            columns={COLUMNS}
            rows={rows}
            getRowKey={(wo) => wo.id}
            rowHref={(wo) => `/dashboard/work-orders/${wo.id}`}
            loading={loading && !data}
            empty={<EmptyState message="Nenhuma OS aberta no período." />}
          />
        )}
        {connection?.pageInfo.hasNextPage && (
          <div className="flex justify-center border-t border-rule px-5 py-3">
            <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>
              Carregar mais
            </Button>
          </div>
        )}
      </SheetSection>
    </>
  )
}
