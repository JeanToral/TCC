import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'

import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/input'
import Spinner from '../../components/ui/Spinner'
import { useAuth } from '../../contexts/AuthContext'
import { DELETE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/DeletePreventivePlan.gql'
import { GENERATE_DUE_PREVENTIVE_WORK_ORDERS } from '../../graphql/preventive-plans/GenerateDuePreventiveWorkOrders.gql'
import { GET_PREVENTIVE_PLANS } from '../../graphql/preventive-plans/GetPreventivePlans.gql'
import type {
  GenerateDuePreventiveWorkOrdersData,
  GetPreventivePlansData,
  PreventivePlan,
} from '../../graphql/preventive-plans/types'
import './PreventivePlansListPage.css'

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short' }).format(new Date(iso))
}

function DueBadge({ nextDueAt }: { readonly nextDueAt: string }) {
  const isPast = new Date(nextDueAt) < new Date()
  return (
    <span className={`due-badge ${isPast ? 'due-badge--overdue' : 'due-badge--ok'}`}>
      {isPast ? '⚠ Vencido' : formatDate(nextDueAt)}
    </span>
  )
}

function PlanRow({
  plan,
  canEdit,
  onDelete,
}: {
  readonly plan: PreventivePlan
  readonly canEdit: boolean
  readonly onDelete: (id: number) => void
}) {
  const navigate = useNavigate()
  return (
    <tr
      className="prev-plans-table__row"
      onClick={() => canEdit && navigate(`/dashboard/preventive-plans/${plan.id}/edit`)}
      tabIndex={canEdit ? 0 : undefined}
      onKeyDown={(e) =>
        canEdit && e.key === 'Enter' && navigate(`/dashboard/preventive-plans/${plan.id}/edit`)
      }
      role={canEdit ? 'link' : undefined}
      aria-label={canEdit ? `Editar ${plan.name}` : undefined}
    >
      <td className="prev-plans-table__cell">
        <span className="prev-plans-table__name">{plan.name}</span>
        {plan.description && (
          <span className="prev-plans-table__desc">{plan.description}</span>
        )}
      </td>
      <td className="prev-plans-table__cell">
        <span className="prev-plans-table__asset">
          {plan.asset?.name ?? '—'}
        </span>
        {plan.asset?.tag && (
          <span className="prev-plans-table__tag">{plan.asset.tag}</span>
        )}
      </td>
      <td className="prev-plans-table__cell prev-plans-table__cell--center">
        {plan.intervalDays}d
      </td>
      <td className="prev-plans-table__cell prev-plans-table__cell--center">
        <DueBadge nextDueAt={plan.nextDueAt} />
      </td>
      <td className="prev-plans-table__cell prev-plans-table__cell--center">
        <span className={`status-badge ${plan.isActive ? 'status-badge--active' : 'status-badge--inactive'}`}>
          {plan.isActive ? 'Ativo' : 'Inativo'}
        </span>
      </td>
      {canEdit && (
        <td
          className="prev-plans-table__cell prev-plans-table__cell--actions"
          onClick={(e) => e.stopPropagation()}
        >
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/dashboard/preventive-plans/${plan.id}/edit`)}
          >
            Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={() => onDelete(plan.id)}>
            Excluir
          </Button>
        </td>
      )}
    </tr>
  )
}

export default function PreventivePlansListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const canEdit = hasPermission('preventiveplan.create')
  const canGenerate = hasPermission('workorder.create')

  const [search, setSearch] = useState('')
  const [generateMsg, setGenerateMsg] = useState<string | null>(null)

  const { data, loading, error } = useQuery<GetPreventivePlansData>(GET_PREVENTIVE_PLANS, {
    fetchPolicy: 'cache-and-network',
  })

  const [deletePlan] = useMutation(DELETE_PREVENTIVE_PLAN, {
    refetchQueries: [{ query: GET_PREVENTIVE_PLANS }],
  })

  const [generate, { loading: generating }] = useMutation<GenerateDuePreventiveWorkOrdersData>(
    GENERATE_DUE_PREVENTIVE_WORK_ORDERS,
    {
      onCompleted: (d) => {
        const n = d.generateDuePreventiveWorkOrders
        setGenerateMsg(
          n === 0
            ? 'Nenhuma OS vencida encontrada.'
            : `${n} OS preventiva${n > 1 ? 's' : ''} gerada${n > 1 ? 's' : ''} com sucesso.`,
        )
      },
    },
  )

  function handleDelete(id: number) {
    if (!window.confirm('Excluir este plano preventivo?')) return
    deletePlan({ variables: { id } }).catch(() => undefined)
  }

  function handleGenerate() {
    setGenerateMsg(null)
    generate().catch(() => undefined)
  }

  const all = data?.preventivePlans ?? []
  const filtered = all.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      (p.asset?.name ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  const overdueCount = all.filter((p) => new Date(p.nextDueAt) < new Date()).length

  return (
    <div className="prev-plans-list-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Planos de Manutenção Preventiva</h1>
          {data && (
            <div className="page-header__meta">
              <span className="page-header__count">
                {all.length} {all.length === 1 ? 'plano' : 'planos'}
              </span>
              {overdueCount > 0 && (
                <span className="page-header__alert">
                  ⚠ {overdueCount} vencido{overdueCount > 1 ? 's' : ''}
                </span>
              )}
            </div>
          )}
        </div>
        <div className="page-header__actions">
          <Input
            placeholder="Buscar por nome ou ativo…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="prev-plans-list-page__search"
          />
          {canGenerate && (
            <Button variant="secondary" onClick={handleGenerate} disabled={generating}>
              {generating ? <Spinner size="sm" /> : 'Gerar OS Vencidas'}
            </Button>
          )}
          {canEdit && (
            <Button onClick={() => navigate('/dashboard/preventive-plans/new')}>
              Novo Plano
            </Button>
          )}
        </div>
      </header>

      {generateMsg && (
        <div className="prev-plans-list-page__msg" role="status">
          {generateMsg}
        </div>
      )}

      {loading && !data && (
        <div className="page-loading"><Spinner size="lg" /></div>
      )}

      {error && (
        <div className="page-error" role="alert">
          Erro ao carregar planos: {error.message}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="page-empty">
          {search ? (
            <p>Nenhum plano encontrado para "{search}".</p>
          ) : (
            <p>Nenhum plano preventivo cadastrado ainda.</p>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="prev-plans-table-card">
          <table className="prev-plans-table">
            <thead>
              <tr>
                <th className="prev-plans-table__th">Nome</th>
                <th className="prev-plans-table__th">Ativo</th>
                <th className="prev-plans-table__th prev-plans-table__th--center">Intervalo</th>
                <th className="prev-plans-table__th prev-plans-table__th--center">Próxima Data</th>
                <th className="prev-plans-table__th prev-plans-table__th--center">Status</th>
                {canEdit && <th className="prev-plans-table__th" aria-label="Ações" />}
              </tr>
            </thead>
            <tbody>
              {filtered.map((plan) => (
                <PlanRow
                  key={plan.id}
                  plan={plan}
                  canEdit={canEdit}
                  onDelete={handleDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
