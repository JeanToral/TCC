import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import type { DashboardFilterInput } from '../../graphql/dashboard/types'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type {
  GetWorkOrdersData,
  Priority,
  WorkOrderListItem,
  WorkOrderStatus,
} from '../../graphql/work-orders/types'
import { OpenedCompletedChart, StatusChart, TypeMixChart } from '../dashboard/DashboardCharts'

const PAGE_SIZE = 50

const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const STATUS_VARIANT: Record<WorkOrderStatus, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  REQUESTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  SCHEDULED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

const DATE = new Intl.DateTimeFormat('pt-BR')

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
      <div className="chart-grid">
        <StatusChart filter={filter} />
        <OpenedCompletedChart filter={filter} />
        <TypeMixChart filter={filter} />
      </div>

      <section className="report-section" aria-label="Ordens de serviço do período">
        <h2 className="report-section__title">Ordens de serviço abertas no período</h2>

        {loading && !data && (
          <div className="page-loading">
            <Spinner />
          </div>
        )}
        {error && <div className="page-error" role="alert">{error.message}</div>}
        {data && rows.length === 0 && <p className="report-empty">Nenhuma OS aberta no período.</p>}

        {rows.length > 0 && (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-table__num">Nº</th>
                  <th>Título</th>
                  <th>Ativo</th>
                  <th>Tipo</th>
                  <th>Prioridade</th>
                  <th>Status</th>
                  <th className="report-table__num">Aberta em</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((wo) => (
                  <tr key={wo.id}>
                    <td className="report-table__num">{wo.id}</td>
                    <td>
                      <Link to={`/dashboard/work-orders/${wo.id}`}>{wo.title}</Link>
                    </td>
                    <td>
                      <strong>{wo.asset.tag}</strong> {wo.asset.name}
                    </td>
                    <td>{wo.type === 'CORRECTIVE' ? 'Corretiva' : 'Preventiva'}</td>
                    <td>{PRIORITY_LABELS[wo.priority]}</td>
                    <td>
                      <Badge variant={STATUS_VARIANT[wo.status]}>{STATUS_LABELS[wo.status]}</Badge>
                    </td>
                    <td className="report-table__num">{DATE.format(new Date(wo.createdAt))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {connection?.pageInfo.hasNextPage && (
          <div className="report-load-more">
            <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>
              Carregar mais
            </Button>
          </div>
        )}
      </section>
    </>
  )
}
