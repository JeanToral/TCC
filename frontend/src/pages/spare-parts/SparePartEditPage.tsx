import { useState, useEffect } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/input'
import { Textarea } from '../../components/ui/textarea'
import Spinner from '../../components/ui/Spinner'
import { GET_SPARE_PART } from '../../graphql/spare-parts/GetSparePart.gql'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
import { CREATE_SPARE_PART } from '../../graphql/spare-parts/CreateSparePart.gql'
import { UPDATE_SPARE_PART } from '../../graphql/spare-parts/UpdateSparePart.gql'
import type { GetSparePartData } from '../../graphql/spare-parts/types'
import './SparePartEditPage.css'

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

  const [form, setForm] = useState<FormState>(empty)
  const [error, setError] = useState<string | null>(null)

  const { data, loading } = useQuery<GetSparePartData>(GET_SPARE_PART, {
    variables: { id: Number(id) },
    skip: isNew,
  })

  useEffect(() => {
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
  }, [data])

  const [createSparePart, { loading: creating }] = useMutation(CREATE_SPARE_PART, {
    refetchQueries: [{ query: GET_SPARE_PARTS }],
  })

  const [updateSparePart, { loading: updating }] = useMutation(UPDATE_SPARE_PART, {
    refetchQueries: [{ query: GET_SPARE_PARTS }],
  })

  const saving = creating || updating

  function set(field: keyof FormState, value: string) {
    setForm((f) => ({ ...f, [field]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    const input = {
      name: form.name.trim(),
      partNumber: form.partNumber.trim(),
      description: form.description.trim() || undefined,
      quantity: parseInt(form.quantity, 10) || 0,
      minimumStock: parseInt(form.minimumStock, 10) || 0,
      unitCost: form.unitCost ? parseFloat(form.unitCost) : undefined,
    }

    try {
      if (isNew) {
        await createSparePart({ variables: { input } })
      } else {
        const { partNumber: _, ...updateInput } = input
        await updateSparePart({ variables: { id: Number(id), input: updateInput } })
      }
      navigate('/dashboard/spare-parts')
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Erro ao salvar'
      setError(msg)
    }
  }

  if (loading) {
    return <div className="page-loading"><Spinner size="lg" /></div>
  }

  return (
    <div className="spare-part-edit-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">
            {isNew ? 'Nova Peça de Reposição' : 'Editar Peça'}
          </h1>
        </div>
      </header>

      <form className="spare-part-form" onSubmit={handleSubmit}>
        <div className="spare-part-form__card">
          <div className="spare-part-form__row">
            <label className="spare-part-form__label">
              Nome *
              <Input
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                required
                placeholder="Ex: Rolamento 6205"
              />
            </label>
            <label className="spare-part-form__label">
              Código (Part Number) *
              <Input
                value={form.partNumber}
                onChange={(e) => set('partNumber', e.target.value)}
                required
                disabled={!isNew}
                placeholder="Ex: ROL-6205"
              />
            </label>
          </div>

          <label className="spare-part-form__label">
            Descrição
            <Textarea
              value={form.description}
              onChange={(e) => set('description', e.target.value)}
              placeholder="Descrição ou especificações da peça…"
              rows={3}
            />
          </label>

          <div className="spare-part-form__row spare-part-form__row--3">
            <label className="spare-part-form__label">
              Quantidade em Estoque
              <Input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(e) => set('quantity', e.target.value)}
              />
            </label>
            <label className="spare-part-form__label">
              Estoque Mínimo
              <Input
                type="number"
                min={0}
                value={form.minimumStock}
                onChange={(e) => set('minimumStock', e.target.value)}
              />
            </label>
            <label className="spare-part-form__label">
              Custo Unitário (R$)
              <Input
                type="number"
                min={0}
                step={0.01}
                value={form.unitCost}
                onChange={(e) => set('unitCost', e.target.value)}
                placeholder="0,00"
              />
            </label>
          </div>

          {error && (
            <div className="spare-part-form__error" role="alert">{error}</div>
          )}

          <div className="spare-part-form__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => navigate('/dashboard/spare-parts')}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? <Spinner size="sm" /> : isNew ? 'Criar Peça' : 'Salvar Alterações'}
            </Button>
          </div>
        </div>
      </form>
    </div>
  )
}
