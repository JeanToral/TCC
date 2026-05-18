import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client'

import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import Spinner from '../../components/ui/Spinner'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { CREATE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/CreatePreventivePlan.gql'
import { GET_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/GetPreventivePlan.gql'
import { GET_PREVENTIVE_PLANS } from '../../graphql/preventive-plans/GetPreventivePlans.gql'
import { UPDATE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/UpdatePreventivePlan.gql'
import type { GetAssetsData } from '../../graphql/assets/types'
import type { GetPreventivePlanData } from '../../graphql/preventive-plans/types'
import './PreventivePlanEditPage.css'

interface FormState {
  name: string
  description: string
  assetId: string
  intervalDays: string
  nextDueAt: string
  isActive: boolean
}

const empty: FormState = {
  name: '',
  description: '',
  assetId: '',
  intervalDays: '30',
  nextDueAt: '',
  isActive: true,
}

function toDateInputValue(iso: string): string {
  return new Date(iso).toISOString().slice(0, 10)
}

export default function PreventivePlanEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id

  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string | null>(null)

  const { data: planData, loading: planLoading } = useQuery<GetPreventivePlanData>(
    GET_PREVENTIVE_PLAN,
    { variables: { id: Number(id) }, skip: isNew },
  )

  const { data: assetsData } = useQuery<GetAssetsData>(GET_ASSETS)

  useEffect(() => {
    if (planData?.preventivePlan) {
      const p = planData.preventivePlan
      setForm({
        name: p.name,
        description: p.description ?? '',
        assetId: String(p.assetId),
        intervalDays: String(p.intervalDays),
        nextDueAt: toDateInputValue(p.nextDueAt),
        isActive: p.isActive,
      })
    }
  }, [planData])

  const refetchQueries = [{ query: GET_PREVENTIVE_PLANS }]

  const [createPlan, { loading: creating }] = useMutation(CREATE_PREVENTIVE_PLAN, {
    refetchQueries,
  })

  const [updatePlan, { loading: updating }] = useMutation(UPDATE_PREVENTIVE_PLAN, {
    refetchQueries,
  })

  const saving = creating || updating

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    try {
      if (isNew) {
        await createPlan({
          variables: {
            input: {
              name: form.name.trim(),
              description: form.description.trim() || undefined,
              assetId: Number(form.assetId),
              intervalDays: parseInt(form.intervalDays, 10),
              nextDueAt: new Date(form.nextDueAt).toISOString(),
            },
          },
        })
      } else {
        await updatePlan({
          variables: {
            id: Number(id),
            input: {
              name: form.name.trim(),
              description: form.description.trim() || undefined,
              intervalDays: parseInt(form.intervalDays, 10),
              nextDueAt: new Date(form.nextDueAt).toISOString(),
              isActive: form.isActive,
            },
          },
        })
      }
      navigate('/dashboard/preventive-plans')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Erro ao salvar')
    }
  }

  if (planLoading) {
    return <div className="page-loading"><Spinner size="lg" /></div>
  }

  const assets = assetsData?.assets ?? []

  return (
    <div className="prev-plan-edit-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">
            {isNew ? 'Novo Plano Preventivo' : 'Editar Plano Preventivo'}
          </h1>
        </div>
      </header>

      <form className="prev-plan-form" onSubmit={handleSubmit}>
        <div className="prev-plan-form__card">
          <div className="prev-plan-form__row">
            <label className="prev-plan-form__label">
              Nome *
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                placeholder="Ex: Troca de óleo mensal"
              />
            </label>
            <label className="prev-plan-form__label">
              Ativo *
              <select
                className="prev-plan-form__select"
                value={form.assetId}
                onChange={(e) => set('assetId', e.target.value)}
                required
                disabled={!isNew}
              >
                <option value="">Selecione um ativo…</option>
                {assets.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.tag})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label className="prev-plan-form__label">
            Descrição
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descreva o procedimento ou critério do plano…"
              rows={3}
            />
          </label>

          <div className="prev-plan-form__row">
            <label className="prev-plan-form__label">
              Intervalo (dias) *
              <Input
                type="number"
                min={1}
                value={form.intervalDays}
                onChange={(e) => set('intervalDays', e.target.value)}
                required
              />
            </label>
            <label className="prev-plan-form__label">
              Próxima Execução *
              <Input
                type="date"
                value={form.nextDueAt}
                onChange={(e) => set('nextDueAt', e.target.value)}
                required
              />
            </label>
          </div>

          {!isNew && (
            <label className="prev-plan-form__label prev-plan-form__label--checkbox">
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => set('isActive', e.target.checked)}
              />
              Plano ativo (gera OS automaticamente quando vencido)
            </label>
          )}

          {error && (
            <div className="prev-plan-form__error" role="alert">{error}</div>
          )}

          <div className="prev-plan-form__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard/preventive-plans')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isNew ? 'Criar Plano' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
