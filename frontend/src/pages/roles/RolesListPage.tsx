import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Spinner from '../../components/ui/Spinner'
import { GET_ROLES_MGMT } from '../../graphql/roles/GetRoles.gql'
import { DELETE_ROLE } from '../../graphql/roles/DeleteRole.gql'
import type { DeleteRoleData, GetRolesData, RoleItem } from '../../graphql/roles/types'
import './RolesListPage.css'

function RoleRow({
  role,
  onDelete,
  deleting,
}: {
  readonly role: RoleItem
  readonly onDelete: (id: number) => void
  readonly deleting: boolean
}) {
  const navigate = useNavigate()
  return (
    <tr className="roles-table__row">
      <td className="roles-table__cell roles-table__cell--name">
        <span className="roles-table__name">{role.name}</span>
        {role.isSystem && (
          <Badge variant="info" className="roles-table__system-badge">Sistema</Badge>
        )}
      </td>
      <td className="roles-table__cell roles-table__cell--muted">
        {role.description ?? '—'}
      </td>
      <td className="roles-table__cell">
        <span className="roles-table__perm-count">
          {role.isSystem && (role.permissions as string[]).includes('*')
            ? 'Acesso total'
            : `${role.permissions.length} permissão${role.permissions.length !== 1 ? 'ões' : ''}`}
        </span>
      </td>
      <td
        className="roles-table__cell roles-table__cell--actions"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/roles/${role.id}`)}
          disabled={role.isSystem}
          title={role.isSystem ? 'Roles de sistema não podem ser editadas' : undefined}
        >
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(role.id)}
          disabled={role.isSystem || deleting}
          title={role.isSystem ? 'Roles de sistema não podem ser deletadas' : undefined}
        >
          Excluir
        </Button>
      </td>
    </tr>
  )
}

export default function RolesListPage() {
  const navigate = useNavigate()
  const [deleteTarget, setDeleteTarget] = useState<number | null>(null)

  const { data, loading, error } = useQuery<GetRolesData>(GET_ROLES_MGMT, {
    fetchPolicy: 'cache-and-network',
  })

  const [deleteRole, { loading: deleting }] = useMutation<DeleteRoleData>(DELETE_ROLE, {
    refetchQueries: [{ query: GET_ROLES_MGMT }],
    onCompleted: () => setDeleteTarget(null),
    onError: (err) => {
      setDeleteTarget(null)
      alert(err.graphQLErrors[0]?.message ?? err.message)
    },
  })

  function handleDeleteConfirm() {
    if (deleteTarget === null) return
    void deleteRole({ variables: { id: deleteTarget } })
  }

  const roles = data?.roles ?? []

  return (
    <div className="roles-list-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Permissões</h1>
          {data && (
            <span className="page-header__count">
              {roles.length} {roles.length === 1 ? 'role' : 'roles'}
            </span>
          )}
        </div>
        <div className="page-header__actions">
          <Button onClick={() => navigate('/dashboard/roles/new')}>
            Nova Role
          </Button>
        </div>
      </header>

      {loading && !data && (
        <div className="page-loading">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <div className="page-error" role="alert">
          Erro ao carregar roles: {error.message}
        </div>
      )}

      {!loading && !error && roles.length === 0 && (
        <div className="page-empty">
          <p>Nenhuma role cadastrada ainda.</p>
        </div>
      )}

      {roles.length > 0 && (
        <div className="roles-table-card">
          <table className="roles-table">
            <thead>
              <tr>
                <th className="roles-table__th">Nome</th>
                <th className="roles-table__th">Descrição</th>
                <th className="roles-table__th">Permissões</th>
                <th className="roles-table__th" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {roles.map((role) => (
                <RoleRow
                  key={role.id}
                  role={role}
                  onDelete={setDeleteTarget}
                  deleting={deleting && deleteTarget === role.id}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}

      {deleteTarget !== null && (
        <div className="roles-list-page__overlay" role="dialog" aria-modal="true">
          <div className="roles-list-page__dialog">
            <h2 className="roles-list-page__dialog-title">Excluir role</h2>
            <p className="roles-list-page__dialog-body">
              Tem certeza que deseja excluir esta role? Usuários atribuídos a ela poderão
              perder acesso ao sistema.
            </p>
            <div className="roles-list-page__dialog-actions">
              <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancelar
              </Button>
              <Button variant="danger" onClick={handleDeleteConfirm} loading={deleting}>
                Excluir
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
