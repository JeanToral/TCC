import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { GetAssetsData } from '../../graphql/assets/types'
import { CREATE_WORK_ORDER } from '../../graphql/work-orders/CreateWorkOrder.gql'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type { CreateWorkOrderData } from '../../graphql/work-orders/types'
import './WorkOrderCreatePage.css'

interface FormState {
  title: string
  description: string
  type: 'CORRECTIVE' | 'PREVENTIVE' | ''
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | ''
  assetId: string
}

interface FormErrors {
  title?: string
  description?: string
  type?: string
  priority?: string
  assetId?: string
}

function validate(form: FormState): FormErrors {
  const errors: FormErrors = {}
  if (!form.title.trim()) errors.title = 'Título é obrigatório'
  else if (form.title.length > 200) errors.title = 'Máximo de 200 caracteres'
  if (!form.description.trim()) errors.description = 'Descrição é obrigatória'
  else if (form.description.length > 2000) errors.description = 'Máximo de 2000 caracteres'
  if (!form.type) errors.type = 'Tipo é obrigatório'
  if (!form.priority) errors.priority = 'Prioridade é obrigatória'
  if (!form.assetId) errors.assetId = 'Ativo é obrigatório'
  return errors
}

export default function WorkOrderCreatePage() {
  const navigate = useNavigate()

  const [form, setForm] = useState<FormState>({
    title: '',
    description: '',
    type: '',
    priority: '',
    assetId: '',
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')

  const { data: assetsData, loading: assetsLoading } = useQuery<GetAssetsData>(GET_ASSETS)

  const [createWorkOrder, { loading: submitting }] = useMutation<CreateWorkOrderData>(CREATE_WORK_ORDER, {
    refetchQueries: [{ query: GET_WORK_ORDERS }],
    onCompleted: (data) => navigate(`/dashboard/work-orders/${data.createWorkOrder.id}`),
    onError: (e) => setSubmitError(e.graphQLErrors[0]?.message ?? e.message),
  })

  function handleChange(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
    if (errors[field]) setErrors((e) => ({ ...e, [field]: undefined }))
    if (submitError) setSubmitError('')
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const errs = validate(form)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    createWorkOrder({
      variables: {
        input: {
          title: form.title.trim(),
          description: form.description.trim(),
          type: form.type,
          priority: form.priority,
          assetId: Number(form.assetId),
        },
      },
    })
  }

  if (assetsLoading) {
    return (
      <div className="page-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  const assets = assetsData?.assets ?? []

  return (
    <div className="wo-create-page">
      <header className="page-header">
        <div className="page-header__info">
          <button type="button" className="wo-create-page__back" onClick={() => navigate('/dashboard/work-orders')}>
            ← Ordens de Serviço
          </button>
          <h1 className="page-header__title">Nova Ordem de Serviço</h1>
        </div>
      </header>

      <form className="wo-create-page__form" onSubmit={handleSubmit} noValidate>
        <div className="form-card">
          <h2 className="form-card__title">Informações da OS</h2>

          <div className="form-card__body">
            <Input
              label="Título"
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={errors.title}
              placeholder="Ex: Falha no rolamento do motor principal"
              maxLength={200}
            />

            <div className="wo-create-page__field">
              <label className="wo-create-page__label" htmlFor="wo-description">
                Descrição
              </label>
              <textarea
                id="wo-description"
                className={`wo-create-page__textarea${errors.description ? ' wo-create-page__textarea--error' : ''}`}
                value={form.description}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={4}
                placeholder="Descreva o problema ou a necessidade de manutenção…"
                maxLength={2000}
              />
              {errors.description && (
                <span className="wo-create-page__error">{errors.description}</span>
              )}
            </div>

            <div className="wo-create-page__row">
              <div className="wo-create-page__field">
                <label className="wo-create-page__label" htmlFor="wo-type">
                  Tipo
                </label>
                <select
                  id="wo-type"
                  className={`wo-create-page__select${errors.type ? ' wo-create-page__select--error' : ''}`}
                  value={form.type}
                  onChange={(e) => handleChange('type', e.target.value)}
                >
                  <option value="">Selecionar tipo…</option>
                  <option value="CORRECTIVE">Corretiva</option>
                  <option value="PREVENTIVE">Preventiva</option>
                </select>
                {errors.type && <span className="wo-create-page__error">{errors.type}</span>}
              </div>

              <div className="wo-create-page__field">
                <label className="wo-create-page__label" htmlFor="wo-priority">
                  Prioridade
                </label>
                <select
                  id="wo-priority"
                  className={`wo-create-page__select${errors.priority ? ' wo-create-page__select--error' : ''}`}
                  value={form.priority}
                  onChange={(e) => handleChange('priority', e.target.value)}
                >
                  <option value="">Selecionar prioridade…</option>
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                  <option value="CRITICAL">Crítica</option>
                </select>
                {errors.priority && <span className="wo-create-page__error">{errors.priority}</span>}
              </div>
            </div>

            <div className="wo-create-page__field">
              <label className="wo-create-page__label" htmlFor="wo-asset">
                Ativo
              </label>
              <select
                id="wo-asset"
                className={`wo-create-page__select${errors.assetId ? ' wo-create-page__select--error' : ''}`}
                value={form.assetId}
                onChange={(e) => handleChange('assetId', e.target.value)}
              >
                <option value="">Selecionar ativo…</option>
                {assets.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.tag} — {a.name}{a.location ? ` (${a.location})` : ''}
                  </option>
                ))}
              </select>
              {errors.assetId && <span className="wo-create-page__error">{errors.assetId}</span>}
            </div>
          </div>
        </div>

        {submitError && (
          <div className="page-error" role="alert">
            {submitError}
          </div>
        )}

        <div className="wo-create-page__footer">
          <Button
            type="button"
            variant="secondary"
            onClick={() => navigate('/dashboard/work-orders')}
            disabled={submitting}
          >
            Cancelar
          </Button>
          <Button type="submit" loading={submitting}>
            Criar Ordem de Serviço
          </Button>
        </div>
      </form>
    </div>
  )
}
