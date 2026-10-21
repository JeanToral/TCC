import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge, { type BadgeVariant } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import Modal from '../../components/ui/Modal'
import { NativeSelect } from '../../components/ui/select'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GET_AUDIT_LOGS } from '../../graphql/audit-log/GetAuditLogs.gql'
import type { AuditLogItem, GetAuditLogsData } from '../../graphql/audit-log/types'

const PAGE_SIZE = 50

const ACTION_LABELS: Record<string, { readonly label: string; readonly variant: BadgeVariant }> = {
  'role.create':           { label: 'Perfil criado',        variant: 'success' },
  'role.update':           { label: 'Perfil alterado',      variant: 'info' },
  'role.delete':           { label: 'Perfil excluído',      variant: 'error' },
  'user.create':           { label: 'Usuário criado',       variant: 'success' },
  'user.update':           { label: 'Usuário alterado',     variant: 'info' },
  'user.updateSelf':       { label: 'Dados pessoais alterados', variant: 'info' },
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
  Role: 'Perfil de acesso',
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
      <div className="grid gap-4 sm:grid-cols-2">
        {(['before', 'after'] as const).map((side) => (
          <section key={side} className="min-w-0">
            <h3 className="mb-2 font-mono text-xs font-medium uppercase tracking-wider text-quiet">
              {side === 'before' ? 'Antes' : 'Depois'}
            </h3>
            <pre className="max-h-96 overflow-auto rounded-xs border border-rule bg-subtle p-3 font-mono text-xs leading-relaxed whitespace-pre-wrap break-words text-body">
              {prettyJson(log[side])}
            </pre>
          </section>
        ))}
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

  const columns: readonly DataTableColumn<AuditLogItem>[] = [
    {
      key: 'date',
      header: 'Data',
      mobile: 'meta',
      cell: (log) => <span className="font-mono text-[0.8125rem] text-quiet">{DATE_TIME.format(new Date(log.createdAt))}</span>,
    },
    {
      key: 'user',
      header: 'Usuário',
      mobile: 'title',
      cell: (log) =>
        log.user ? (
          <span className="flex flex-col">
            <span className="font-medium">{log.user.name}</span>
            <span className="font-mono text-xs text-quiet max-sm:hidden">{log.user.email}</span>
          </span>
        ) : (
          '—'
        ),
    },
    {
      key: 'action',
      header: 'Ação',
      cell: (log) => {
        const action = ACTION_LABELS[log.action]
        return <Badge variant={action?.variant ?? 'default'}>{action?.label ?? log.action}</Badge>
      },
    },
    { key: 'target', header: 'Registro', cell: (log) => <TargetCell log={log} /> },
    {
      key: 'changes',
      header: 'Detalhes',
      cell: (log) =>
        log.before !== null || log.after !== null ? (
          <Button variant="ghost" size="sm" onClick={() => setSelected(log)}>
            Ver alterações
          </Button>
        ) : null,
    },
  ]

  return (
    <Sheet>
      <SheetHeader
        eyebrow="Administração"
        title="Logs de Auditoria"
        actions={
          <NativeSelect
            id="audit-log-target"
            label="Tipo de registro"
            className="w-56"
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
        }
      >
        {data && (
          <span className="font-mono text-xs text-quiet">
            {logs.length}
            {connection?.pageInfo.hasNextPage ? '+' : ''} {logs.length === 1 ? 'registro' : 'registros'}
          </span>
        )}
      </SheetHeader>

      {error ? (
        <FormAlert className="mb-5">Erro ao carregar logs: {error.message}</FormAlert>
      ) : (
        <DataTable
          label="Logs de auditoria"
          columns={columns}
          rows={logs}
          getRowKey={(log) => log.id}
          loading={loading && !data}
          empty={<EmptyState message="Nenhum registro encontrado." />}
        />
      )}

      {connection?.pageInfo.hasNextPage && (
        <div className="flex justify-center border-t border-rule px-5 py-3">
          <Button variant="secondary" onClick={handleLoadMore} loading={loadingMore}>
            Carregar mais
          </Button>
        </div>
      )}

      {selected && <ChangesModal log={selected} onClose={() => setSelected(null)} />}
    </Sheet>
  )
}

export default function AuditLogPage() {
  const { hasPermission } = useAuth()

  if (!hasPermission('auditlog.read')) {
    return (
      <Sheet>
        <SheetHeader eyebrow="Administração" title="Logs de Auditoria" />
        <FormAlert className="mb-5">Você não tem permissão para ver os logs de auditoria.</FormAlert>
      </Sheet>
    )
  }

  return <AuditLogList />
}
