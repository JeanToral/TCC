import { type ChangeEvent, type FormEvent, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Spinner from '../../components/ui/Spinner'
import { CREATE_ASSET } from '../../graphql/assets/CreateAsset.gql'
import { GET_ASSET } from '../../graphql/assets/GetAsset.gql'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { UPDATE_ASSET } from '../../graphql/assets/UpdateAsset.gql'
import type { CreateAssetData, GetAssetData, UpdateAssetData } from '../../graphql/assets/types'
import './AssetEditPage.css'

interface FormState {
  name: string
  tag: string
  location: string
  manufacturer: string
  model: string
  serialNumber: string
  installDate: string
}

interface FormErrors {
  name?: string
  tag?: string
}

const EMPTY_FORM: FormState = {
  name: '',
  tag: '',
  location: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  installDate: '',
}

function toDateInput(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toISOString().slice(0, 10)
}

export default function AssetEditPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const isEdit = !!id

  const [form, setForm] = useState<FormState>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const [submitError, setSubmitError] = useState('')

  const { data: assetData, loading: assetLoading } = useQuery<GetAssetData>(
    GET_ASSET,
    { variables: { id: Number(id) }, skip: !isEdit },
  )

  useEffect(() => {
    if (assetData?.asset) {
      const { asset } = assetData
      setForm({
        name: asset.name,
        tag: asset.tag,
        location: asset.location ?? '',
        manufacturer: asset.manufacturer ?? '',
        model: asset.model ?? '',
        serialNumber: asset.serialNumber ?? '',
        installDate: toDateInput(asset.installDate),
      })
    }
  }, [assetData])

  const [createAsset, { loading: creating }] = useMutation<CreateAssetData>(CREATE_ASSET, {
    refetchQueries: [{ query: GET_ASSETS }],
    onCompleted: (data) => navigate(`/dashboard/assets/${data.createAsset.id}`),
    onError: (err) => setSubmitError(err.graphQLErrors[0]?.message ?? err.message),
  })

  const [updateAsset, { loading: updating }] = useMutation<UpdateAssetData>(UPDATE_ASSET, {
    refetchQueries: [{ query: GET_ASSETS }, { query: GET_ASSET, variables: { id: Number(id) } }],
    onCompleted: () => navigate(`/dashboard/assets/${id}`),
    onError: (err) => setSubmitError(err.graphQLErrors[0]?.message ?? err.message),
  })

  const submitting = creating || updating

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    if (submitError) setSubmitError('')
  }

  function validate(): boolean {
    const next: FormErrors = {}
    if (!form.name.trim()) next.name = 'Nome é obrigatório.'
    if (!form.tag.trim()) next.tag = 'Tag é obrigatória.'
    setErrors(next)
    return Object.keys(next).length === 0
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (!validate()) return

    const input = {
      name: form.name.trim(),
      tag: form.tag.trim(),
      location: form.location.trim() || undefined,
      manufacturer: form.manufacturer.trim() || undefined,
      model: form.model.trim() || undefined,
      serialNumber: form.serialNumber.trim() || undefined,
      installDate: form.installDate ? new Date(form.installDate).toISOString() : undefined,
    }

    if (isEdit) {
      updateAsset({ variables: { id: Number(id), input } })
    } else {
      createAsset({ variables: { input } })
    }
  }

  if (isEdit && assetLoading) {
    return <div className="page-loading"><Spinner size="lg" /></div>
  }

  return (
    <div className="asset-edit-page">
      <header className="page-header">
        <div className="page-header__info">
          <button
            type="button"
            className="asset-edit-page__back"
            onClick={() => navigate(isEdit ? `/dashboard/assets/${id}` : '/dashboard/assets')}
          >
            ← {isEdit ? 'Voltar' : 'Ativos'}
          </button>
          <h1 className="page-header__title">
            {isEdit ? 'Editar Ativo' : 'Novo Ativo'}
          </h1>
        </div>
      </header>

      <div className="asset-edit-page__card">
        <form onSubmit={handleSubmit} noValidate>
          {submitError && (
            <div className="asset-edit-page__alert" role="alert">
              {submitError}
            </div>
          )}

          <div className="asset-edit-page__section">
            <h2 className="asset-edit-page__section-title">Identificação</h2>
            <div className="asset-edit-page__fields">
              <Input
                label="Nome"
                name="name"
                value={form.name}
                onChange={handleChange}
                error={errors.name}
                placeholder="Ex.: Torno CNC #3"
                disabled={submitting}
              />
              <Input
                label="Tag"
                name="tag"
                value={form.tag}
                onChange={handleChange}
                error={errors.tag}
                placeholder="Ex.: TRN-003"
                hint="Identificador único do ativo."
                disabled={submitting}
              />
              <Input
                label="Localização"
                name="location"
                value={form.location}
                onChange={handleChange}
                placeholder="Ex.: Galpão A — Setor 2"
                disabled={submitting}
              />
            </div>
          </div>

          <div className="asset-edit-page__section">
            <h2 className="asset-edit-page__section-title">Especificações técnicas</h2>
            <div className="asset-edit-page__fields">
              <Input
                label="Fabricante"
                name="manufacturer"
                value={form.manufacturer}
                onChange={handleChange}
                placeholder="Ex.: Romi"
                disabled={submitting}
              />
              <Input
                label="Modelo"
                name="model"
                value={form.model}
                onChange={handleChange}
                placeholder="Ex.: GL 240"
                disabled={submitting}
              />
              <Input
                label="Número de série"
                name="serialNumber"
                value={form.serialNumber}
                onChange={handleChange}
                placeholder="Ex.: SN-2024-00123"
                disabled={submitting}
              />
              <Input
                label="Data de instalação"
                name="installDate"
                type="date"
                value={form.installDate}
                onChange={handleChange}
                disabled={submitting}
              />
            </div>
          </div>

          <footer className="asset-edit-page__footer">
            <Button
              type="button"
              variant="secondary"
              onClick={() => navigate(isEdit ? `/dashboard/assets/${id}` : '/dashboard/assets')}
              disabled={submitting}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={submitting}>
              {isEdit ? 'Salvar alterações' : 'Criar ativo'}
            </Button>
          </footer>
        </form>
      </div>
    </div>
  )
}
