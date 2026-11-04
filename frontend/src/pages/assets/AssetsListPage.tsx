import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { Asset, GetAssetsData } from '../../graphql/assets/types'
import { formatDay } from '../../lib/period'


const COLUMNS: readonly DataTableColumn<Asset>[] = [
  {
    key: 'tag',
    header: 'TAG',
    link: true,
    className: 'w-32',
    cell: (a) => <span className="font-mono font-medium">{a.tag}</span>,
  },
  {
    key: 'name',
    header: 'Nome',
    mobile: 'title',
    cell: (a) => (
      <span className="flex flex-col">
        <span className="font-medium">{a.name}</span>
        {a.location && <span className="text-xs text-quiet max-sm:hidden">{a.location}</span>}
      </span>
    ),
  },
  { key: 'manufacturer', header: 'Fabricante', cell: (a) => a.manufacturer ?? '—' },
  { key: 'model', header: 'Modelo', mobile: 'hidden', cell: (a) => a.model ?? '—' },
  {
    key: 'installed',
    header: 'Instalação',
    align: 'right',
    mobile: 'hidden',
    cell: (a) => <span className="font-mono text-quiet">{a.installDate ? formatDay(a.installDate) : '—'}</span>,
  },
]

function matches(asset: Asset, term: string): boolean {
  const t = term.toLowerCase()
  return [asset.name, asset.tag, asset.manufacturer ?? ''].some((v) => v.toLowerCase().includes(t))
}

export default function AssetsListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [search, setSearch] = useState('')
  const { data, loading, error } = useQuery<GetAssetsData>(GET_ASSETS, { fetchPolicy: 'cache-and-network' })

  const all = data?.assets ?? []
  const filtered = search ? all.filter((a) => matches(a, search)) : all
  const canCreate = hasPermission('asset.create')

  return (
    <Sheet>
      <SheetHeader
        eyebrow="Cadastros"
        title="Ativos"
        actions={
          <>
            <Input
              placeholder="Buscar por nome, TAG ou fabricante…"
              aria-label="Buscar ativos"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-72 max-w-full"
            />
            {canCreate && <Button onClick={() => navigate('/dashboard/assets/new')}>Cadastrar ativo</Button>}
          </>
        }
      >
        {data && (
          <span className="font-mono text-xs text-quiet">
            {all.length} {all.length === 1 ? 'ativo' : 'ativos'}
          </span>
        )}
      </SheetHeader>

      {error ? (
        <FormAlert className="mb-5">Erro ao carregar ativos: {error.message}</FormAlert>
      ) : (
        <DataTable
          label="Ativos"
          columns={COLUMNS}
          rows={filtered}
          getRowKey={(a) => a.id}
          rowHref={(a) => `/dashboard/assets/${a.id}`}
          loading={loading && !data}
          empty={
            <EmptyState
              message={search ? `Nenhum ativo encontrado para "${search}".` : 'Nenhum ativo cadastrado.'}
              action={
                canCreate && !search ? <Link to="/dashboard/assets/new">Cadastrar ativo</Link> : undefined
              }
            />
          }
        />
      )}
    </Sheet>
  )
}
