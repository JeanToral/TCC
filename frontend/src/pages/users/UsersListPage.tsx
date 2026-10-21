import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import type { GetUsersData, UserListItem } from '../../graphql/users/types'

const DATE = new Intl.DateTimeFormat('pt-BR')

const COLUMNS: readonly DataTableColumn<UserListItem>[] = [
  {
    key: 'name',
    header: 'Nome',
    link: true,
    mobile: 'title',
    cell: (u) => <span className="font-medium">{u.name}</span>,
  },
  { key: 'email', header: 'E-mail', cell: (u) => <span className="font-mono text-[0.8125rem]">{u.email}</span> },
  { key: 'role', header: 'Perfil de acesso', cell: (u) => u.role.name },
  {
    key: 'active',
    header: 'Situação',
    cell: (u) => <Badge variant={u.isActive ? 'success' : 'default'}>{u.isActive ? 'Ativo' : 'Inativo'}</Badge>,
  },
  {
    key: 'created',
    header: 'Cadastrado em',
    align: 'right',
    mobile: 'hidden',
    cell: (u) => <span className="text-quiet">{DATE.format(new Date(u.createdAt))}</span>,
  },
]

export default function UsersListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [search, setSearch] = useState('')
  const { data, loading, error } = useQuery<GetUsersData>(GET_USERS, { fetchPolicy: 'cache-and-network' })

  const all = data?.users ?? []
  const term = search.toLowerCase()
  const filtered = all.filter((u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term))
  const canCreate = hasPermission('user.create')

  return (
    <Sheet>
      <SheetHeader
        eyebrow="Administração"
        title="Usuários"
        actions={
          <>
            <Input
              placeholder="Buscar por nome ou e-mail…"
              aria-label="Buscar usuários"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 max-w-full"
            />
            {canCreate && <Button onClick={() => navigate('/dashboard/users/new')}>Cadastrar usuário</Button>}
          </>
        }
      >
        {data && (
          <span className="font-mono text-xs text-quiet">
            {all.length} {all.length === 1 ? 'usuário' : 'usuários'}
          </span>
        )}
      </SheetHeader>

      {error ? (
        <FormAlert className="mb-5">Erro ao carregar usuários: {error.message}</FormAlert>
      ) : (
        <DataTable
          label="Usuários"
          columns={COLUMNS}
          rows={filtered}
          getRowKey={(u) => u.id}
          rowHref={(u) => `/dashboard/users/${u.id}`}
          loading={loading && !data}
          empty={
            <EmptyState
              message={search ? `Nenhum usuário encontrado para "${search}".` : 'Nenhum usuário cadastrado.'}
              action={canCreate && !search ? <Link to="/dashboard/users/new">Cadastrar usuário</Link> : undefined}
            />
          }
        />
      )}
    </Sheet>
  )
}
