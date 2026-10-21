import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GET_ROLES_MGMT } from '../../graphql/roles/GetRoles.gql'
import type { GetRolesData, RoleItem } from '../../graphql/roles/types'

function permissionSummary(role: RoleItem): string {
  if (role.permissions.includes('*')) return 'Acesso total'
  const n = role.permissions.length
  return `${n} ${n === 1 ? 'permissão' : 'permissões'}`
}

const COLUMNS: readonly DataTableColumn<RoleItem>[] = [
  {
    key: 'name',
    header: 'Perfil',
    link: true,
    mobile: 'title',
    cell: (r) => <span className="font-medium">{r.name}</span>,
  },
  { key: 'description', header: 'Descrição', mobile: 'hidden', cell: (r) => <span className="text-quiet">{r.description ?? '—'}</span> },
  { key: 'permissions', header: 'Permissões', cell: (r) => <span className="font-mono text-[0.8125rem]">{permissionSummary(r)}</span> },
  { key: 'system', header: 'Tipo', cell: (r) => (r.isSystem ? <Badge variant="info">Sistema</Badge> : <Badge>Personalizado</Badge>) },
]

export default function RolesListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const { data, loading, error } = useQuery<GetRolesData>(GET_ROLES_MGMT, { fetchPolicy: 'cache-and-network' })

  const roles = data?.roles ?? []
  const canCreate = hasPermission('role.create')

  return (
    <Sheet>
      <SheetHeader
        eyebrow="Administração"
        title="Perfis de acesso"
        actions={
          canCreate ? <Button onClick={() => navigate('/dashboard/roles/new')}>Cadastrar perfil</Button> : undefined
        }
      >
        {data && (
          <span className="font-mono text-xs text-quiet">
            {roles.length} {roles.length === 1 ? 'perfil' : 'perfis'}
          </span>
        )}
      </SheetHeader>

      {error ? (
        <FormAlert className="mb-5">Erro ao carregar perfis de acesso: {error.message}</FormAlert>
      ) : (
        <DataTable
          label="Perfis de acesso"
          columns={COLUMNS}
          rows={roles}
          getRowKey={(r) => r.id}
          rowHref={(r) => `/dashboard/roles/${r.id}`}
          loading={loading && !data}
          empty={
            <EmptyState
              message="Nenhum perfil de acesso cadastrado."
              action={canCreate ? <Link to="/dashboard/roles/new">Cadastrar perfil</Link> : undefined}
            />
          }
        />
      )}
    </Sheet>
  )
}
