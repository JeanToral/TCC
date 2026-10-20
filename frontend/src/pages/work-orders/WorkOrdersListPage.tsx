import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import ExportButton from '../../components/ui/ExportButton'
import { FormAlert } from '../../components/ui/FormLayout'
import PriorityMark from '../../components/ui/PriorityMark'
import { NativeSelect } from '../../components/ui/select'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type { GetWorkOrdersData, WorkOrderListItem, WorkOrderStatus } from '../../graphql/work-orders/types'
import {
  WORK_ORDER_STATUS_LABELS,
  WORK_ORDER_STATUS_VARIANT,
  WORK_ORDER_TYPE_LABELS,
  formatWorkOrderCode,
} from '../../lib/work-order-labels'

const PAGE_SIZE = 20

const DATE = new Intl.DateTimeFormat('pt-BR')

const COLUMNS: readonly DataTableColumn<WorkOrderListItem>[] = [
  {
    key: 'code',
    header: 'Nº',
    link: true,
    className: 'w-24',
    cell: (wo) => <span className="font-mono font-medium tabular-nums">{formatWorkOrderCode(wo.id)}</span>,
  },
  {
    key: 'title',
    header: 'Título',
    mobile: 'title',
    cell: (wo) => (
      <span className="flex flex-col">
        <span className="line-clamp-1 font-medium">{wo.title}</span>
        <span className="text-xs text-quiet max-sm:hidden">{WORK_ORDER_TYPE_LABELS[wo.type]}</span>
      </span>
    ),
  },
  {
    key: 'asset',
    header: 'Ativo',
    cell: (wo) => (
      <span className="flex flex-col">
        <span className="font-mono text-[0.8125rem]">{wo.asset.tag}</span>
        <span className="text-xs text-quiet max-sm:hidden">{wo.asset.name}</span>
      </span>
    ),
  },
  { key: 'priority', header: 'Prioridade', cell: (wo) => <PriorityMark priority={wo.priority} /> },
  {
    key: 'status',
    header: 'Situação',
    cell: (wo) => <Badge variant={WORK_ORDER_STATUS_VARIANT[wo.status]}>{WORK_ORDER_STATUS_LABELS[wo.status]}</Badge>,
  },
  { key: 'requester', header: 'Solicitante', mobile: 'hidden', cell: (wo) => wo.requestedBy.name },
  {
    key: 'created',
    header: 'Aberta em',
    align: 'right',
    mobile: 'hidden',
    cell: (wo) => <span className="font-mono text-quiet">{DATE.format(new Date(wo.createdAt))}</span>,
  },
]

export default function WorkOrdersListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | ''>('')
  const [loadingMore, setLoadingMore] = useState(false)

  const filter = statusFilter ? { filter: { status: statusFilter } } : {}
  const { data, loading, error, fetchMore } = useQuery<GetWorkOrdersData>(GET_WORK_ORDERS, {
    variables: { first: PAGE_SIZE, ...filter },
    fetchPolicy: 'cache-and-network',
  })

  const connection = data?.workOrders
  const workOrders: readonly WorkOrderListItem[] = connection?.edges.map((e) => e.node) ?? []
  const hasNextPage = connection?.pageInfo.hasNextPage ?? false
  const endCursor = connection?.pageInfo.endCursor ?? null
  const canCreate = hasPermission('workorder.create')

  function handleLoadMore() {
    if (!endCursor || loadingMore) return
    setLoadingMore(true)
    void fetchMore({
      variables: { first: PAGE_SIZE, after: endCursor, ...filter },
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

  const countLabel = data
    ? `${workOrders.length}${hasNextPage ? '+' : ''} ${workOrders.length === 1 ? 'ordem' : 'ordens'}`
    : undefined

  return (
    <Sheet>
      <SheetHeader
        eyebrow="Operação"
        title="Ordens de Serviço"
        actions={
          <>
            <NativeSelect
              className="w-44"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | '')}
              aria-label="Filtrar por situação"
            >
              <option value="">Todas as situações</option>
              {(Object.keys(WORK_ORDER_STATUS_LABELS) as WorkOrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {WORK_ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </NativeSelect>
            {/* Exporta o conjunto completo do filtro, não só as linhas carregadas */}
            <ExportButton path="work-orders" params={{ status: statusFilter || undefined }} fallbackName="ordens-de-servico" />
            {canCreate && <Button onClick={() => navigate('/dashboard/work-orders/new')}>Abrir OS</Button>}
          </>
        }
      >
        {countLabel && <span className="font-mono text-xs text-quiet">{countLabel}</span>}
      </SheetHeader>

      {error && (
        <FormAlert className="mb-5">Erro ao carregar ordens de serviço: {error.message}</FormAlert>
      )}

      {!error && (
        <DataTable
          label="Ordens de serviço"
          columns={COLUMNS}
          rows={workOrders}
          getRowKey={(wo) => wo.id}
          rowHref={(wo) => `/dashboard/work-orders/${wo.id}`}
          loading={loading && !data}
          empty={
            <EmptyState
              message={
                statusFilter
                  ? `Nenhuma OS na situação "${WORK_ORDER_STATUS_LABELS[statusFilter]}".`
                  : 'Nenhuma ordem de serviço aberta.'
              }
              action={canCreate && !statusFilter ? <Link to="/dashboard/work-orders/new">Abrir OS</Link> : undefined}
            />
          }
        />
      )}

      {hasNextPage && (
        <div className="flex justify-center border-t border-rule px-5 py-3">
          <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>
            Carregar mais
          </Button>
        </div>
      )}
    </Sheet>
  )
}
