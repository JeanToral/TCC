import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { usePageCrumb } from '../../components/layout/Breadcrumbs'
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
import { MoneyInput } from '../../components/ui/money-input'
import Modal from '../../components/ui/Modal'
import MoreActions from '../../components/ui/MoreActions'
import { SheetHeader } from '../../components/ui/Sheet'
import Skeleton from '../../components/ui/Skeleton'
import { Textarea } from '../../components/ui/textarea'
import { useAuth } from '../../contexts/AuthContext'
import { CREATE_SPARE_PART } from '../../graphql/spare-parts/CreateSparePart.gql'
import { DELETE_SPARE_PART } from '../../graphql/spare-parts/DeleteSparePart.gql'
import { GET_SPARE_PART } from '../../graphql/spare-parts/GetSparePart.gql'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
import { UPDATE_SPARE_PART } from '../../graphql/spare-parts/UpdateSparePart.gql'
import type { GetSparePartData } from '../../graphql/spare-parts/types'
import { errorMessage } from '../../lib/utils'

interface FormState {
  name: string
  partNumber: string
  description: string
  quantity: string
  minimumStock: string
  unitCost: string
}

const empty: FormState = {
  name: '',
  partNumber: '',
  description: '',
  quantity: '0',
  minimumStock: '0',
  unitCost: '',
}

export default function SparePartEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isNew = !id
  const { hasPermission } = useAuth()

  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string | null>(null)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data, loading } = useQuery<GetSparePartData>(GET_SPARE_PART, {
    variables: { id: Number(id) },
    skip: isNew,
  })
  usePageCrumb(data?.sparePart?.partNumber)

  // Preenche o formulário quando os dados chegam — ajuste de estado no render,
  // não em efeito (react.dev/learn/you-might-not-need-an-effect).
  const [loadedData, setLoadedData] = useState<typeof data>(undefined)
  if (data !== loadedData) {
    setLoadedData(data)
    if (data?.sparePart) {
      const p = data.sparePart
      setForm({
        name: p.name,
        partNumber: p.partNumber,
        description: p.description ?? '',
        quantity: String(p.quantity),
        minimumStock: String(p.minimumStock),
        unitCost: p.unitCost != null ? String(p.unitCost) : '',
      })
    }
  }

  const [createSparePart, { loading: creating }] = useMutation(CREATE_SPARE_PART, {
    refetchQueries: [{ query: GET_SPARE_PARTS }],
  })

  const [updateSparePart, { loading: updating }] = useMutation(UPDATE_SPARE_PART, {
    refetchQueries: [{ query: GET_SPARE_PARTS }],
  })

  const [deleteSparePart, { loading: deleting }] = useMutation(DELETE_SPARE_PART, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_SPARE_PARTS }],
    onCompleted: () => navigate('/dashboard/spare-parts'),
    onError: (err) => {
      setDeleteOpen(false)
      setError(errorMessage(err))
    },
  })

  const saving = creating || updating

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    // O código da peça não muda depois de criada; o input de edição não o aceita.
    const updateInput = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      quantity: parseInt(form.quantity, 10) || 0,
      minimumStock: parseInt(form.minimumStock, 10) || 0,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
    }

    try {
      if (isNew) {
        await createSparePart({
          variables: { input: { ...updateInput, partNumber: form.partNumber.trim() } },
        })
      } else {
        await updateSparePart({ variables: { id: Number(id), input: updateInput } })
      }
      navigate('/dashboard/spare-parts')
    } catch (err: unknown) {
      setError(errorMessage(err))
    }
  }

  if (loading) {
    return (
      <div className="flex max-w-5xl flex-col gap-3 rounded-xs border border-rule bg-sheet p-5" role="status" aria-label="Carregando">
        <Skeleton className="h-6 w-40" />
        <Skeleton className="h-24" />
      </div>
    )
  }

  const lowStock = !isNew && Number(form.quantity) < Number(form.minimumStock)

  return (
    <>
      <FormLayout
        onSubmit={handleSubmit}
        header={
          <SheetHeader
            eyebrow="Peça de reposição"
            code={isNew ? undefined : data?.sparePart?.partNumber}
            title={isNew ? 'Nova peça' : 'Editar peça'}
            actions={
              isNew ? undefined : (
                <MoreActions
                  align="start"
                  items={[
                    {
                      label: 'Excluir peça',
                      danger: true,
                      onSelect: () => setDeleteOpen(true),
                      disabledReason: hasPermission('sparepart.delete')
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

        <FormSection title="Identificação">
          <FormGrid columns={2}>
            <FormField>
              <Input
                id="part-name"
                label="Nome"
                required
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Ex: Rolamento 6205"
              />
            </FormField>
            <FormField>
              <Input
                id="part-number"
                label="Código (Part Number)"
                required
                value={form.partNumber}
                onChange={(e) => set('partNumber', e.target.value)}
                disabled={!isNew}
                placeholder="Ex: ROL-6205"
                className="font-mono"
                hint={isNew ? undefined : 'O código não muda depois do cadastro.'}
              />
            </FormField>
            <FormField span="full">
              <Textarea
                id="part-description"
                label="Descrição"
                value={form.description}
                onChange={(e) => set('description', e.target.value)}
                placeholder="Descrição ou especificações da peça…"
                rows={3}
              />
            </FormField>
          </FormGrid>
        </FormSection>

        <FormSection title="Estoque">
          {lowStock && (
            <FormAlert variant="warning" className="m-0 mb-3">
              Estoque abaixo do mínimo.
            </FormAlert>
          )}
          <FormGrid>
            <FormField>
              <Input
                id="part-quantity"
                label="Quantidade em Estoque"
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
                className="font-mono"
              />
            </FormField>
            <FormField>
              <Input
                id="part-minimum"
                label="Estoque Mínimo"
                type="number"
                min={0}
                value={form.minimumStock}
                onChange={(e) => set('minimumStock', e.target.value)}
                className="font-mono"
              />
            </FormField>
            <FormField>
              <MoneyInput
                id="part-cost"
                label="Custo Unitário"
                value={form.unitCost}
                onValueChange={(v) => set('unitCost', v)}
              />
              {!form.unitCost.trim() && (
                <p className="pb-1 text-xs text-[var(--warning-text)]" role="status">
                  Peças sem custo tornam o relatório financeiro incompleto.
                </p>
              )}
            </FormField>
          </FormGrid>
        </FormSection>

        <FormActions>
          <Button type="button" variant="link" onClick={() => navigate('/dashboard/spare-parts')}>
            Cancelar
          </Button>
          <Button type="submit" loading={saving}>
            {isNew ? 'Cadastrar peça' : 'Salvar alterações'}
          </Button>
        </FormActions>
      </FormLayout>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Excluir peça"
        size="sm"
        footer={
          <>
            <Button variant="link" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => deleteSparePart()}>
              Confirmar exclusão
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-body">
          Excluir a peça <strong>{form.name}</strong> (<span className="font-mono">{form.partNumber}</span>)?
        </p>
      </Modal>
    </>
  )
}
