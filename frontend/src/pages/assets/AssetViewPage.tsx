import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { DELETE_ASSET } from '../../graphql/assets/DeleteAsset.gql'
import { GET_ASSET } from '../../graphql/assets/GetAsset.gql'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { DeleteAssetData, GetAssetData } from '../../graphql/assets/types'
import './AssetViewPage.css'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium' }).format(new Date(iso))
}

function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso))
}

export default function AssetViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const { data, loading, error } = useQuery<GetAssetData>(GET_ASSET, {
    variables: { id: Number(id) },
    skip: !id,
  })

  const [deleteAsset, { loading: deleting }] = useMutation<DeleteAssetData>(DELETE_ASSET, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_ASSETS }],
    onCompleted: () => navigate('/dashboard/assets'),
    onError: (e) => setDeleteError(e.graphQLErrors[0]?.message ?? e.message),
  })

  if (loading) {
    return <div className="page-loading"><Spinner size="lg" /></div>
  }

  if (error || !data?.asset) {
    return (
      <div className="asset-view-page">
        <div className="page-error" role="alert">
          {error ? `Erro: ${error.message}` : 'Ativo não encontrado.'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard/assets')} className="asset-view-page__back-btn">
          ← Voltar para lista
        </Button>
      </div>
    )
  }

  const asset = data.asset

  return (
    <div className="asset-view-page">
      <header className="page-header">
        <div className="page-header__info">
          <button type="button" className="asset-view-page__back" onClick={() => navigate('/dashboard/assets')}>
            ← Ativos
          </button>
          <h1 className="page-header__title">{asset.name}</h1>
          <span className="asset-view-page__tag">{asset.tag}</span>
        </div>
        <div className="page-header__actions">
          <Button variant="secondary" onClick={() => navigate(`/dashboard/assets/${id}/edit`)}>
            Editar
          </Button>
          <Button variant="danger" onClick={() => { setDeleteError(''); setDeleteOpen(true) }}>
            Remover
          </Button>
        </div>
      </header>

      <div className="asset-view-page__grid">
        <div className="detail-card asset-view-page__card--wide">
          <h2 className="detail-card__title">Informações gerais</h2>
          <dl className="detail-list">
            <div className="asset-view-page__row">
              <div className="detail-list__item">
                <dt className="detail-list__label">Tag</dt>
                <dd className="detail-list__value asset-view-page__tag-value">{asset.tag}</dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Localização</dt>
                <dd className="detail-list__value">{asset.location ?? '—'}</dd>
              </div>
            </div>
            <div className="asset-view-page__row">
              <div className="detail-list__item">
                <dt className="detail-list__label">Fabricante</dt>
                <dd className="detail-list__value">{asset.manufacturer ?? '—'}</dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Modelo</dt>
                <dd className="detail-list__value">{asset.model ?? '—'}</dd>
              </div>
            </div>
            <div className="asset-view-page__row">
              <div className="detail-list__item">
                <dt className="detail-list__label">Número de série</dt>
                <dd className="detail-list__value">{asset.serialNumber ?? '—'}</dd>
              </div>
              <div className="detail-list__item">
                <dt className="detail-list__label">Data de instalação</dt>
                <dd className="detail-list__value">{formatDate(asset.installDate)}</dd>
              </div>
            </div>
          </dl>
        </div>

        <div className="detail-card">
          <h2 className="detail-card__title">Metadados</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Criado em</dt>
              <dd className="detail-list__value">{formatDateTime(asset.createdAt)}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Atualizado em</dt>
              <dd className="detail-list__value">{formatDateTime(asset.updatedAt)}</dd>
            </div>
          </dl>
        </div>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover ativo"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => deleteAsset()}>
              Confirmar remoção
            </Button>
          </>
        }
      >
        <p className="asset-view-page__modal-msg">
          Tem certeza que deseja remover o ativo <strong>{asset.name}</strong> ({asset.tag})?
          As ordens de serviço vinculadas serão preservadas.
        </p>
        {deleteError && <p className="asset-view-page__modal-error">{deleteError}</p>}
      </Modal>
    </div>
  )
}
