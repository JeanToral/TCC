import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import {
  FormActions,
  FormAlert,
  FormField,
  FormGrid,
  FormLayout,
  FormSection,
} from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import { NativeSelect } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { SheetHeader } from '../../components/ui/Sheet'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { GetAssetsData } from '../../graphql/assets/types'
import { CREATE_WORK_ORDER } from '../../graphql/work-orders/CreateWorkOrder.gql'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type { CreateWorkOrderData } from '../../graphql/work-orders/types'
import { errorMessage } from '../../lib/utils'
import { PRIORITY_LABELS, WORK_ORDER_TYPE_LABELS } from '../../lib/work-order-labels'

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
    onError: (e) => setSubmitError(errorMessage(e)),
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

  const assets = assetsData?.assets ?? []

  return (
    <FormLayout
      onSubmit={handleSubmit}
      noValidate
      header={
        <SheetHeader
          eyebrow="Ordem de Serviço"
          title="Abrir ordem de serviço"
          meta={[
            { label: 'Situação inicial', value: 'Solicitada' },
            { label: 'Próxima etapa', value: 'Aprovação' },
          ]}
        />
      }
    >
      {submitError && <FormAlert>{submitError}</FormAlert>}

      <FormSection title="Pedido">
        <FormGrid>
          <FormField span="full">
            <Input
              label="Título"
              required
              value={form.title}
              onChange={(e) => handleChange('title', e.target.value)}
              error={errors.title}
              placeholder="Ex: Falha no rolamento do motor principal"
              maxLength={200}
            />
          </FormField>

          <FormField>
            <NativeSelect
              id="wo-type"
              label="Tipo"
              required
              value={form.type}
              onChange={(e) => handleChange('type', e.target.value)}
              error={errors.type}
            >
              <option value="">Selecionar tipo…</option>
              {(['CORRECTIVE', 'PREVENTIVE'] as const).map((t) => (
                <option key={t} value={t}>
                  {WORK_ORDER_TYPE_LABELS[t]}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField>
            <NativeSelect
              id="wo-priority"
              label="Prioridade"
              required
              value={form.priority}
              onChange={(e) => handleChange('priority', e.target.value)}
              error={errors.priority}
            >
              <option value="">Selecionar prioridade…</option>
              {(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'] as const).map((p) => (
                <option key={p} value={p}>
                  {PRIORITY_LABELS[p]}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField>
            <NativeSelect
              id="wo-asset"
              label="Ativo"
              required
              disabled={assetsLoading}
              value={form.assetId}
              onChange={(e) => handleChange('assetId', e.target.value)}
              error={errors.assetId}
            >
              <option value="">{assetsLoading ? 'Carregando ativos…' : 'Selecionar ativo…'}</option>
              {assets.map((a) => (
                <option key={a.id} value={String(a.id)}>
                  {a.tag} — {a.name}{a.location ? ` (${a.location})` : ''}
                </option>
              ))}
            </NativeSelect>
          </FormField>

          <FormField span="full">
            <Textarea
              id="wo-description"
              label="Descrição"
              required
              value={form.description}
              onChange={(e) => handleChange('description', e.target.value)}
              rows={5}
              placeholder="Descreva o problema ou a necessidade de manutenção…"
              maxLength={2000}
              error={errors.description}
            />
          </FormField>
        </FormGrid>
      </FormSection>

      <FormActions>
        <Button
          type="button"
          variant="link"
          onClick={() => navigate('/dashboard/work-orders')}
          disabled={submitting}
        >
          Cancelar
        </Button>
        <Button type="submit" loading={submitting}>
          Abrir OS
        </Button>
      </FormActions>
    </FormLayout>
  )
}
