import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GENERATE_DUE_PREVENTIVE_WORK_ORDERS } from '../../graphql/preventive-plans/GenerateDuePreventiveWorkOrders.gql'
import { GET_PREVENTIVE_PLANS } from '../../graphql/preventive-plans/GetPreventivePlans.gql'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type {
  GenerateDuePreventiveWorkOrdersData,
  GetPreventivePlansData,
  PreventiveGenerationResult,
  PreventivePlan,
} from '../../graphql/preventive-plans/types'
import { formatDay, isPastDay } from '../../lib/period'
import { errorMessage } from '../../lib/utils'

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`

/** Resumo de "Gerar OS vencidas": geradas e puladas viram aviso; falhas viram erro. */
function generationSummary({ generated, skipped, failedPlans }: PreventiveGenerationResult): {
  readonly message: string | null
  readonly error: string | null
} {
  const parts = [
    generated > 0 && plural(generated, 'OS preventiva gerada', 'OS preventivas geradas'),
    skipped > 0 && `${plural(skipped, 'plano pulado', 'planos pulados')} por já ter OS aberta`,
  ].filter(Boolean)
  const message = parts.length > 0 ? `${parts.join(' · ')}.` : failedPlans.length === 0 ? 'Nenhum plano vencido.' : null
  const error =
    failedPlans.length > 0
      ? `Falha ao gerar OS de: ${failedPlans.join(', ')}. Veja o log do servidor.`
      : null
  return { message, error }
}

function isOverdue(plan: PreventivePlan): boolean {
  return isPastDay(plan.nextDueAt)
}

const COLUMNS: readonly DataTableColumn<PreventivePlan>[] = [
  {
    key: 'name',
    header: 'Plano',
    link: true,
    mobile: 'title',
    cell: (p) => (
      <span className="flex flex-col">
        <span className="font-medium">{p.name}</span>
        {p.description && <span className="line-clamp-1 text-xs text-quiet max-sm:hidden">{p.description}</span>}
      </span>
    ),
  },
  {
    key: 'asset',
    header: 'Ativo',
    cell: (p) => (
      <span className="flex flex-col">
        <span className="font-mono text-[0.8125rem]">{p.asset?.tag ?? '—'}</span>
        <span className="text-xs text-quiet max-sm:hidden">{p.asset?.name}</span>
      </span>
    ),
  },
  {
    key: 'interval',
    header: 'Intervalo',
    align: 'right',
    mobile: 'hidden',
    cell: (p) => <span className="font-mono">{p.intervalDays} d</span>,
  },
  {
    key: 'due',
    header: 'Próxima execução',
    align: 'right',
    cell: (p) => (
      <span className="inline-flex items-center gap-2">
        {isOverdue(p) && <Badge variant="error">Vencido</Badge>}
        <span className={isOverdue(p) ? 'font-mono text-error' : 'font-mono'}>{formatDay(p.nextDueAt)}</span>
      </span>
    ),
  },
  {
    key: 'active',
    header: 'Situação',
    cell: (p) => <Badge variant={p.isActive ? 'success' : 'default'}>{p.isActive ? 'Ativo' : 'Inativo'}</Badge>,
  },
]

export default function PreventivePlansListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canCreate = hasPermission('preventiveplan.create')
  const canEdit = hasPermission('preventiveplan.update')
  const canGenerate = hasPermission('workorder.create')

  const [search, setSearch] = useState('')
  const [generateMsg, setGenerateMsg] = useState<string | null>(null)
  const [generateError, setGenerateError] = useState<string | null>(null)

  const { data, loading, error } = useQuery<GetPreventivePlansData>(GET_PREVENTIVE_PLANS, {
    fetchPolicy: 'cache-and-network',
  })

  const [generate, { loading: generating }] = useMutation<GenerateDuePreventiveWorkOrdersData>(
    GENERATE_DUE_PREVENTIVE_WORK_ORDERS,
    {
      refetchQueries: [GET_PREVENTIVE_PLANS, GET_WORK_ORDERS],
      onCompleted: (d) => {
        const { message, error } = generationSummary(d.generateDuePreventiveWorkOrders)
        setGenerateMsg(message)
        setGenerateError(error)
      },
      onError: (err) => setGenerateError(errorMessage(err)),
    },
  )

  function handleGenerate() {
    setGenerateMsg(null)
    setGenerateError(null)
    void generate()
  }

  const all = data?.preventivePlans ?? []
  const term = search.toLowerCase()
  const filtered = all.filter(
    (p) => p.name.toLowerCase().includes(term) || (p.asset?.name ?? '').toLowerCase().includes(term),
  )
  const overdueCount = all.filter(isOverdue).length

  return (
    <Sheet>
      <SheetHeader
        eyebrow="Operação"
        title="Planos Preventivos"
        actions={
          <>
            <Input
              placeholder="Buscar por nome ou ativo…"
              aria-label="Buscar planos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 max-w-full"
            />
            {canGenerate && (
              <Button variant="secondary" onClick={handleGenerate} loading={generating}>
                Gerar OS vencidas
              </Button>
            )}
            {canCreate && (
              <Button onClick={() => navigate('/dashboard/preventive-plans/new')}>Cadastrar plano</Button>
            )}
          </>
        }
      >
        {data && (
          <span className="flex flex-wrap items-center gap-2 font-mono text-xs text-quiet">
            {all.length} {all.length === 1 ? 'plano' : 'planos'}
            {overdueCount > 0 && (
              <Badge variant="error">
                {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
              </Badge>
            )}
          </span>
        )}
      </SheetHeader>

      {generateMsg && (
        <FormAlert variant="success" className="mb-5">
          {generateMsg}
        </FormAlert>
      )}
      {generateError && <FormAlert className="mb-5">{generateError}</FormAlert>}

      {error ? (
        <FormAlert className="mb-5">Erro ao carregar planos: {error.message}</FormAlert>
      ) : (
        <DataTable
          label="Planos preventivos"
          columns={COLUMNS}
          rows={filtered}
          getRowKey={(p) => p.id}
          rowHref={canEdit ? (p) => `/dashboard/preventive-plans/${p.id}/edit` : undefined}
          loading={loading && !data}
          empty={
            <EmptyState
              message={search ? `Nenhum plano encontrado para "${search}".` : 'Nenhum plano preventivo cadastrado.'}
              action={
                canCreate && !search ? <Link to="/dashboard/preventive-plans/new">Cadastrar plano</Link> : undefined
              }
            />
          }
        />
      )}
    </Sheet>
  )
}
