import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/input'
import Spinner from '../../components/ui/Spinner'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import type { GetUsersData, UserListItem } from '../../graphql/users/types'
import './UsersListPage.css'

function userInitials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase()
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso))
}

function UserRow({ user }: { readonly user: UserListItem }) {
  const navigate = useNavigate()
  return (
    <tr
      className="users-table__row"
      onClick={() => navigate(`/dashboard/users/${user.id}`)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/users/${user.id}`)}
      role="link"
      aria-label={`Ver detalhes de ${user.name}`}
    >
      <td className="users-table__cell users-table__cell--name">
        <span className="users-table__avatar" aria-hidden="true">
          {userInitials(user.name)}
        </span>
        <div className="users-table__name-group">
          <span className="users-table__name">{user.name}</span>
          <span className="users-table__email">{user.email}</span>
        </div>
      </td>
      <td className="users-table__cell">{user.role.name}</td>
      <td className="users-table__cell">
        <Badge variant={user.isActive ? 'success' : 'default'}>
          {user.isActive ? 'Ativo' : 'Inativo'}
        </Badge>
      </td>
      <td className="users-table__cell users-table__cell--date">
        {formatDate(user.createdAt)}
      </td>
      <td
        className="users-table__cell users-table__cell--actions"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/users/${user.id}`)}
        >
          Ver
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/users/${user.id}/edit`)}
        >
          Editar
        </Button>
      </td>
    </tr>
  )
}

export default function UsersListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, loading, error } = useQuery<GetUsersData>(GET_USERS, {
    fetchPolicy: 'cache-and-network',
  })

  const filtered = (data?.users ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="users-list-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Usuários</h1>
          {data && (
            <span className="page-header__count">
              {data.users.length} {data.users.length === 1 ? 'usuário' : 'usuários'}
            </span>
          )}
        </div>
        <div className="page-header__actions">
          <Input
            placeholder="Buscar por nome ou e-mail…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="users-list-page__search"
          />
          <Button onClick={() => navigate('/dashboard/users/new')}>
            Novo Usuário
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
          Erro ao carregar usuários: {error.message}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="page-empty">
          {search ? (
            <p>Nenhum usuário encontrado para "{search}".</p>
          ) : (
            <p>Nenhum usuário cadastrado ainda.</p>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="users-table-card">
          <table className="users-table">
            <thead>
              <tr>
                <th className="users-table__th">Usuário</th>
                <th className="users-table__th">Função</th>
                <th className="users-table__th">Status</th>
                <th className="users-table__th">Criado em</th>
                <th className="users-table__th" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((user) => (
                <UserRow key={user.id} user={user} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
