import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import Spinner from '../../components/ui/Spinner'
import { REMOVE_USER } from '../../graphql/users/DeleteUser.gql'
import { GET_USER } from '../../graphql/users/GetUser.gql'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import type { GetUserData, RemoveUserData } from '../../graphql/users/types'
import './UserViewPage.css'

function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(iso))
}

export default function UserViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [deleteOpen, setDeleteOpen] = useState(false)

  const { data, loading, error } = useQuery<GetUserData>(GET_USER, {
    variables: { id: Number(id) },
    skip: !id,
  })

  const [removeUser, { loading: removing }] = useMutation<RemoveUserData>(
    REMOVE_USER,
    {
      variables: { id: Number(id) },
      refetchQueries: [{ query: GET_USERS }],
      onCompleted: () => navigate('/dashboard/users'),
    },
  )

  if (loading) {
    return (
      <div className="page-loading">
        <Spinner size="lg" />
      </div>
    )
  }

  if (error || !data?.user) {
    return (
      <div className="user-view-page">
        <div className="page-error" role="alert">
          {error ? `Erro: ${error.message}` : 'Usuário não encontrado.'}
        </div>
        <Button variant="secondary" onClick={() => navigate('/dashboard/users')} className="user-view-page__back-btn">
          ← Voltar para lista
        </Button>
      </div>
    )
  }

  const { user } = data

  return (
    <div className="user-view-page">
      {/* Header */}
      <header className="page-header">
        <div className="page-header__info">
          <button
            type="button"
            className="user-view-page__back"
            onClick={() => navigate('/dashboard/users')}
          >
            ← Usuários
          </button>
          <h1 className="page-header__title">{user.name}</h1>
          <Badge variant={user.isActive ? 'success' : 'default'}>
            {user.isActive ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        <div className="page-header__actions">
          <Button
            variant="secondary"
            onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}
          >
            Editar
          </Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>
            Excluir
          </Button>
        </div>
      </header>

      {/* Detail cards */}
      <div className="user-view-page__grid">
        {/* Informações básicas */}
        <div className="detail-card">
          <h2 className="detail-card__title">Informações básicas</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Nome</dt>
              <dd className="detail-list__value">{user.name}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">E-mail</dt>
              <dd className="detail-list__value">{user.email}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Status</dt>
              <dd className="detail-list__value">
                <Badge variant={user.isActive ? 'success' : 'default'}>
                  {user.isActive ? 'Ativo' : 'Inativo'}
                </Badge>
              </dd>
            </div>
          </dl>
        </div>

        {/* Função */}
        <div className="detail-card">
          <h2 className="detail-card__title">Função</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Nome</dt>
              <dd className="detail-list__value">{user.role.name}</dd>
            </div>
            {user.role.description && (
              <div className="detail-list__item">
                <dt className="detail-list__label">Descrição</dt>
                <dd className="detail-list__value">{user.role.description}</dd>
              </div>
            )}
            <div className="detail-list__item">
              <dt className="detail-list__label">Permissões</dt>
              <dd className="detail-list__value detail-list__value--permissions">
                {(user.role.permissions as string[]).includes('*') ? (
                  <Badge variant="info">Acesso total</Badge>
                ) : (
                  <span className="detail-list__perm-count">
                    {user.role.permissions.length} permissão
                    {user.role.permissions.length !== 1 ? 'ões' : ''}
                  </span>
                )}
              </dd>
            </div>
          </dl>
        </div>

        {/* Metadados */}
        <div className="detail-card">
          <h2 className="detail-card__title">Metadados</h2>
          <dl className="detail-list">
            <div className="detail-list__item">
              <dt className="detail-list__label">Criado em</dt>
              <dd className="detail-list__value">{formatDateTime(user.createdAt)}</dd>
            </div>
            <div className="detail-list__item">
              <dt className="detail-list__label">Atualizado em</dt>
              <dd className="detail-list__value">{formatDateTime(user.updatedAt)}</dd>
            </div>
            {user.deletedAt && (
              <div className="detail-list__item">
                <dt className="detail-list__label">Excluído em</dt>
                <dd className="detail-list__value detail-list__value--deleted">
                  {formatDateTime(user.deletedAt)}
                </dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      {/* Delete confirmation */}
      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Confirmar exclusão"
        size="sm"
        footer={
          <>
            <Button
              variant="secondary"
              onClick={() => setDeleteOpen(false)}
              disabled={removing}
            >
              Cancelar
            </Button>
            <Button
              variant="danger"
              loading={removing}
              onClick={() => removeUser()}
            >
              Excluir
            </Button>
          </>
        }
      >
        <p className="user-view-page__delete-msg">
          Tem certeza que deseja excluir o usuário{' '}
          <strong>{user.name}</strong>? Esta ação não pode ser desfeita.
        </p>
      </Modal>
    </div>
  )
}
