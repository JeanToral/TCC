import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { NativeSelect } from '../../components/ui/select'
import Spinner from '../../components/ui/Spinner'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type { GetWorkOrdersData, Priority, WorkOrderListItem, WorkOrderStatus } from '../../graphql/work-orders/types'
import './WorkOrdersListPage.css'

// ── Helpers ────────────────────────────────────────────────
const STATUS_LABELS: Record<WorkOrderStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

const STATUS_VARIANT: Record<WorkOrderStatus, BadgeVariant> = {
  REQUESTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  SCHEDULED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
}

const PRIORITY_VARIANT: Record<Priority, BadgeVariant> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso))
}

// ── WorkOrderRow ───────────────────────────────────────────
function WorkOrderRow({ wo }: { readonly wo: WorkOrderListItem }) {
  const navigate = useNavigate()
  return (
    <tr
      className="wo-table__row"
      onClick={() => navigate(`/dashboard/work-orders/${wo.id}`)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/work-orders/${wo.id}`)}
      role="link"
      aria-label={`Ver detalhes da OS ${wo.title}`}
    >
      <td className="wo-table__cell wo-table__cell--title">
        <span className="wo-table__title">{wo.title}</span>
        <span className="wo-table__type">{wo.type === 'CORRECTIVE' ? 'Corretiva' : 'Preventiva'}</span>
      </td>
      <td className="wo-table__cell">
        <span className="wo-table__asset-tag">{wo.asset.tag}</span>
        <span className="wo-table__asset-name">{wo.asset.name}</span>
      </td>
      <td className="wo-table__cell">
        <Badge variant={PRIORITY_VARIANT[wo.priority]}>{PRIORITY_LABELS[wo.priority]}</Badge>
      </td>
      <td className="wo-table__cell">
        <Badge variant={STATUS_VARIANT[wo.status]}>{STATUS_LABELS[wo.status]}</Badge>
      </td>
      <td className="wo-table__cell wo-table__cell--muted">{wo.requestedBy.name}</td>
      <td className="wo-table__cell wo-table__cell--date">{formatDate(wo.createdAt)}</td>
      <td
        className="wo-table__cell wo-table__cell--actions"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/work-orders/${wo.id}`)}
        >
          Ver
        </Button>
      </td>
    </tr>
  )
}

// ── Page ───────────────────────────────────────────────────
export default function WorkOrdersListPage() {
  const navigate = useNavigate()
  const [statusFilter, setStatusFilter] = useState<WorkOrderStatus | ''>('')

  const { data, loading, error } = useQuery<GetWorkOrdersData>(GET_WORK_ORDERS, {
    variables: statusFilter ? { filter: { status: statusFilter } } : {},
    fetchPolicy: 'cache-and-network',
  })

  const workOrders = data?.workOrders ?? []

  return (
    <div className="wo-list-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Ordens de Serviço</h1>
          {data && (
            <span className="page-header__count">
              {workOrders.length} {workOrders.length === 1 ? 'ordem' : 'ordens'}
            </span>
          )}
        </div>
        <div className="page-header__actions">
          <NativeSelect
            className="wo-list-page__filter"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as WorkOrderStatus | '')}
            aria-label="Filtrar por status"
          >
            <option value="">Todos os status</option>
            {(Object.keys(STATUS_LABELS) as WorkOrderStatus[]).map((s) => (
              <option key={s} value={s}>{STATUS_LABELS[s]}</option>
            ))}
          </NativeSelect>
          <Button onClick={() => navigate('/dashboard/work-orders/new')}>
            Nova OS
          </Button>
        </div>
      </header>

      {loading && !data && (
        <div className="page-loading">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="page-error" role="alert">
          Erro ao carregar ordens de serviço: {error.message}
        </div>
      )}

      {!loading && !error && workOrders.length === 0 && (
        <div className="page-empty">
          {statusFilter ? (
            <p>Nenhuma OS com status "{STATUS_LABELS[statusFilter]}".</p>
          ) : (
            <p>Nenhuma ordem de serviço cadastrada ainda.</p>
          )}
        </div>
      )}

      {workOrders.length > 0 && (
        <div className="wo-table-card">
          <table className="wo-table">
            <thead>
              <tr>
                <th className="wo-table__th">Título</th>
                <th className="wo-table__th">Ativo</th>
                <th className="wo-table__th">Prioridade</th>
                <th className="wo-table__th">Status</th>
                <th className="wo-table__th">Solicitado por</th>
                <th className="wo-table__th">Criado em</th>
                <th className="wo-table__th" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {workOrders.map((wo) => (
                <WorkOrderRow key={wo.id} wo={wo} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
