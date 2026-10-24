import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { usePageCrumb } from '../../components/layout/Breadcrumbs'
import Button from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/checkbox'
import { DatePicker } from '../../components/ui/date-picker'
import {
  FormActions,
  FormAlert,
  FormField,
  FormGrid,
  FormLayout,
  FormSection,
} from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import Modal from '../../components/ui/Modal'
import MoreActions from '../../components/ui/MoreActions'
import { NativeSelect } from '../../components/ui/select'
import { SheetHeader } from '../../components/ui/Sheet'
import Skeleton from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/textarea'
import { useAuth } from '../../contexts/AuthContext'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { GetAssetsData } from '../../graphql/assets/types'
import { CREATE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/CreatePreventivePlan.gql'
import { DELETE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/DeletePreventivePlan.gql'
import { GET_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/GetPreventivePlan.gql'
import { GET_PREVENTIVE_PLANS } from '../../graphql/preventive-plans/GetPreventivePlans.gql'
import { UPDATE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/UpdatePreventivePlan.gql'
import type { GetPreventivePlanData } from '../../graphql/preventive-plans/types'
import { atLocalNoon, parseDayValue } from '../../lib/period'
import { errorMessage } from '../../lib/utils'

interface FormState {
  name: string
  description: string
  assetId: string
  intervalDays: string
  nextDueAt: Date | undefined
  isActive: boolean
}

const empty: FormState = {
  name: '',
  description: '',
  assetId: '',
  intervalDays: '30',
  nextDueAt: undefined,
  isActive: true,
}

export default function PreventivePlanEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id
  const { hasPermission } = useAuth()

  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data: planData, loading: planLoading } = useQuery<GetPreventivePlanData>(
    GET_PREVENTIVE_PLAN,
    { variables: { id: Number(id) }, skip: isNew },
  )

  const { data: assetsData } = useQuery<GetAssetsData>(GET_ASSETS)
  usePageCrumb(planData?.preventivePlan?.name)

  // Preenche o formulário quando os dados chegam — ajuste de estado no render,
  // não em efeito (react.dev/learn/you-might-not-need-an-effect).
  const [loadedData, setLoadedData] = useState<typeof planData>(undefined)
  if (planData !== loadedData) {
    setLoadedData(planData)
    if (planData?.preventivePlan) {
      const p = planData.preventivePlan
      setForm({
        name: p.name,
        description: p.description ?? '',
        assetId: String(p.assetId),
        intervalDays: String(p.intervalDays),
        nextDueAt: parseDayValue(p.nextDueAt),
        isActive: p.isActive,
      })
    }
  }

  const refetchQueries = [{ query: GET_PREVENTIVE_PLANS }]

  const [createPlan, { loading: creating }] = useMutation(CREATE_PREVENTIVE_PLAN, {
    refetchQueries,
  })

  const [updatePlan, { loading: updating }] = useMutation(UPDATE_PREVENTIVE_PLAN, {
    refetchQueries,
  })

  const [deletePlan, { loading: deleting }] = useMutation(DELETE_PREVENTIVE_PLAN, {
    variables: { id: Number(id) },
    refetchQueries,
    onCompleted: () => navigate('/dashboard/preventive-plans'),
    onError: (err) => {
      setDeleteOpen(false)
      setError(errorMessage(err))
    },
  })

  const saving = creating || updating

  function set<K extends keyof FormState>(field: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!form.nextDueAt) {
      setError('Informe a próxima execução.')
      return
    }
    const loadedDue = planData?.preventivePlan ? parseDayValue(planData.preventivePlan.nextDueAt) : undefined
    const nextDueChanged = loadedDue?.getTime() !== form.nextDueAt.getTime()

    try {
      if (isNew) {
        await createPlan({
          variables: {
            input: {
              name: form.name.trim(),
              description: form.description.trim() || undefined,
              assetId: Number(form.assetId),
              intervalDays: parseInt(form.intervalDays, 10),
              nextDueAt: atLocalNoon(form.nextDueAt).toISOString(),
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
              // Plano atrasado continua editável: a data só vai se foi alterada.
              ...(nextDueChanged ? { nextDueAt: atLocalNoon(form.nextDueAt).toISOString() } : {}),
              isActive: form.isActive,
            },
          },
        })
      }
      navigate('/dashboard/preventive-plans')
    } catch (err: unknown) {
      setError(errorMessage(err))
    }
  }

  if (planLoading) {
    return (
      <div className="flex max-w-5xl flex-col gap-3 rounded-xs border border-rule bg-sheet p-5" role="status" aria-label="Carregando">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  const assets = assetsData?.assets ?? []

  return (
    <>
      <FormLayout
        onSubmit={handleSubmit}
        header={
          <SheetHeader
            eyebrow="Plano preventivo"
            title={isNew ? 'Novo plano preventivo' : 'Editar plano preventivo'}
            actions={
              isNew ? undefined : (
                <MoreActions
                  align="start"
                  items={[
                    {
                      label: 'Excluir plano',
                      danger: true,
                      onSelect: () => setDeleteOpen(true),
                      disabledReason: hasPermission('preventiveplan.delete')
                        ? undefined
                        : 'Você não tem permissão para esta ação',
                    },
                  ]}
                />
              )
            }
          />
        }
      >
        {error && <FormAlert>{error}</FormAlert>}

        <FormSection title="Plano">
          <FormGrid columns={2}>
            <FormField>
              <Input
                id="plan-name"
                label="Nome"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Troca de óleo mensal"
              />
            </FormField>
            <FormField>
              <NativeSelect
                id="plan-asset"
                label="Ativo"
                required
                value={form.assetId}
                onChange={(e) => set('assetId', e.target.value)}
                disabled={!isNew}
              >
                <option value="">Selecione um ativo…</option>
                {assets.map((a) => (
                  <option key={a.id} value={String(a.id)}>
                    {a.name} ({a.tag})
                  </option>
                ))}
              </NativeSelect>
            </FormField>
            <FormField span="full">
              <Textarea
                id="plan-description"
                label="Descrição"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Descreva o procedimento ou critério do plano…"
                rows={3}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Periodicidade">
          <FormGrid columns={2}>
            <FormField>
              <Input
                id="plan-interval"
                label="Intervalo (dias)"
                required
                type="number"
                min={1}
                value={form.intervalDays}
                onChange={(e) => set('intervalDays', e.target.value)}
                className="font-mono"
              />
            </FormField>
            <FormField>
              <DatePicker
                label="Próxima Execução"
                required
                value={form.nextDueAt}
                onSelect={(day) => set('nextDueAt', day)}
                fromDate={new Date()}
              />
            </FormField>

            {!isNew && (
              <FormField span="full">
                <label htmlFor="plan-active" className="flex items-center gap-2 py-1.5 text-sm text-ink">
                  <Checkbox
                    id="plan-active"
                    checked={form.isActive}
                    onCheckedChange={(checked) => set('isActive', checked === true)}
                  />
                  Plano ativo (gera OS automaticamente quando vencido)
                </label>
              </FormField>
            )}
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button type="button" variant="link" onClick={() => navigate('/dashboard/preventive-plans')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isNew ? 'Cadastrar plano' : 'Salvar alterações'}
          </Button>
        </FormActions>
      </FormLayout>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir plano"
        size="sm"
        footer={
          <>
            <Button variant="link" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => deletePlan()}>
              Confirmar exclusão
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-body">
          Excluir o plano <strong>{form.name}</strong>? As OS já geradas por ele são preservadas.
        </p>
      </Modal>
    </>
  )
}
