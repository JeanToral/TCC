import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { NativeSelect } from '../../components/ui/select'
import { useAuth } from '../../contexts/AuthContext'
import { GET_AUDIT_LOGS } from '../../graphql/audit-log/GetAuditLogs.gql'
import type { AuditLogItem, GetAuditLogsData } from '../../graphql/audit-log/types'
import './AuditLogPage.css'

const PAGE_SIZE = 50

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

const ACTION_LABELS: Record<string, { readonly label: string; readonly variant: BadgeVariant }> = {
  'role.create':           { label: 'Role criada',          variant: 'success' },
  'role.update':           { label: 'Role alterada',        variant: 'info' },
  'role.delete':           { label: 'Role excluída',        variant: 'error' },
  'user.create':           { label: 'Usuário criado',       variant: 'success' },
  'user.update':           { label: 'Usuário alterado',     variant: 'info' },
  'user.updateSelf':       { label: 'Perfil alterado',      variant: 'info' },
  'user.delete':           { label: 'Usuário excluído',     variant: 'error' },
  'workorder.create':      { label: 'OS aberta',            variant: 'success' },
  'workorder.approve':     { label: 'OS aprovada',          variant: 'info' },
  'workorder.reject':      { label: 'OS rejeitada',         variant: 'error' },
  'workorder.schedule':    { label: 'OS agendada',          variant: 'info' },
  'workorder.start':       { label: 'OS iniciada',          variant: 'info' },
  'workorder.complete':    { label: 'OS concluída',         variant: 'success' },
  'workorder.cancel':      { label: 'OS cancelada',         variant: 'warning' },
  'workordercost.create':  { label: 'Custo lançado',        variant: 'success' },
  'workordercost.update':  { label: 'Custo alterado',       variant: 'warning' },
  'workordercost.delete':  { label: 'Custo excluído',       variant: 'error' },
}

const TARGET_LABELS: Record<string, string> = {
  Role: 'Role',
  User: 'Usuário',
  WorkOrder: 'Ordem de Serviço',
  WorkOrderExternalCost: 'Serviço externo',
}

const TARGET_PATHS: Record<string, (id: number) => string> = {
  Role: (id) => `/dashboard/roles/${id}`,
  User: (id) => `/dashboard/users/${id}`,
  WorkOrder: (id) => `/dashboard/work-orders/${id}`,
}

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'medium' })

function prettyJson(raw: string | null): string {
  if (raw === null) return '—'
  try {
    return JSON.stringify(JSON.parse(raw), null, 2)
  } catch {
    return raw
  }
}

function TargetCell({ log }: { readonly log: AuditLogItem }) {
  const label = `${TARGET_LABELS[log.targetType] ?? log.targetType} #${log.targetId}`
  const toPath = TARGET_PATHS[log.targetType]
  return toPath ? <Link to={toPath(log.targetId)}>{label}</Link> : <span>{label}</span>
}

function ChangesModal({ log, onClose }: { readonly log: AuditLogItem; readonly onClose: () => void }) {
  return (
    <Modal open onClose={onClose} title={`Registro #${log.id}`} size="lg">
      <div className="audit-log-diff">
        <section className="audit-log-diff__side">
          <h3 className="audit-log-diff__title">Antes</h3>
          <pre className="audit-log-diff__json">{prettyJson(log.before)}</pre>
        </section>
        <section className="audit-log-diff__side">
          <h3 className="audit-log-diff__title">Depois</h3>
          <pre className="audit-log-diff__json">{prettyJson(log.after)}</pre>
        </section>
      </div>
    </Modal>
  )
}

function AuditLogList() {
  const [targetType, setTargetType] = useState('')
  const [selected, setSelected] = useState<AuditLogItem | null>(null)
  const [loadingMore, setLoadingMore] = useState(false)

  const variables = { targetType: targetType || undefined, first: PAGE_SIZE }
  const { data, loading, error, fetchMore } = useQuery<GetAuditLogsData>(GET_AUDIT_LOGS, {
    variables,
    fetchPolicy: 'cache-and-network',
  })

  const connection = data?.auditLogs
  const logs: readonly AuditLogItem[] = connection?.edges.map((e) => e.node) ?? []
  const endCursor = connection?.pageInfo.endCursor ?? null

  function handleLoadMore() {
    if (!endCursor || loadingMore) return
    setLoadingMore(true)
    void fetchMore({
      variables: { ...variables, after: endCursor },
      updateQuery(prev, { fetchMoreResult }) {
        if (!fetchMoreResult) return prev
        return {
          auditLogs: {
            edges: [...prev.auditLogs.edges, ...fetchMoreResult.auditLogs.edges],
            pageInfo: fetchMoreResult.auditLogs.pageInfo,
          },
        }
      },
    }).finally(() => setLoadingMore(false))
  }

  return (
    <div className="audit-log-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Logs de Auditoria</h1>
          {data && (
            <span className="page-header__count">
              {logs.length}
              {connection?.pageInfo.hasNextPage ? '+' : ''} {logs.length === 1 ? 'registro' : 'registros'}
            </span>
          )}
        </div>
      </header>

      <div className="audit-log-page__filters">
        <NativeSelect
          id="audit-log-target"
          label="Tipo de registro"
          className="audit-log-page__select"
          value={targetType}
          onChange={(e) => setTargetType(e.target.value)}
        >
          <option value="">Todos</option>
          {Object.entries(TARGET_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </NativeSelect>
      </div>

      {loading && !data && (
        <div className="page-loading">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="page-error" role="alert">
          Erro ao carregar logs: {error.message}
        </div>
      )}

      {data && logs.length === 0 && (
        <div className="page-empty">
          <p>Nenhum registro encontrado.</p>
        </div>
      )}

      {logs.length > 0 && (
        <div className="audit-log-table-card">
          <table className="audit-log-table">
            <thead>
              <tr>
                <th className="audit-log-table__th">Data</th>
                <th className="audit-log-table__th">Usuário</th>
                <th className="audit-log-table__th">Ação</th>
                <th className="audit-log-table__th">Registro</th>
                <th className="audit-log-table__th" aria-label="Detalhes" />
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => {
                const action = ACTION_LABELS[log.action]
                const hasChanges = log.before !== null || log.after !== null
                return (
                  <tr key={log.id} className="audit-log-table__row">
                    <td className="audit-log-table__cell audit-log-table__cell--date">
                      {DATE_TIME.format(new Date(log.createdAt))}
                    </td>
                    <td className="audit-log-table__cell">
                      {log.user ? (
                        <>
                          <span className="audit-log-table__user">{log.user.name}</span>
                          <span className="audit-log-table__email">{log.user.email}</span>
                        </>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="audit-log-table__cell">
                      <Badge variant={action?.variant ?? 'default'}>{action?.label ?? log.action}</Badge>
                    </td>
                    <td className="audit-log-table__cell">
                      <TargetCell log={log} />
                    </td>
                    <td className="audit-log-table__cell audit-log-table__cell--actions">
                      {hasChanges && (
                        <Button variant="ghost" size="sm" onClick={() => setSelected(log)}>
                          Ver alterações
                        </Button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {connection?.pageInfo.hasNextPage && (
        <div className="audit-log-page__load-more">
          <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>
            Carregar mais
          </Button>
        </div>
      )}

      {selected && <ChangesModal log={selected} onClose={() => setSelected(null)} />}
    </div>
  )
}

export default function AuditLogPage() {
  const { hasPermission } = useAuth()

  if (!hasPermission('auditlog.read')) {
    return (
      <div className="page-error" role="alert">
        Você não tem permissão para ver os logs de auditoria.
      </div>
    )
  }

  return <AuditLogList />
}
