import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { Checkbox } from '../../components/ui/checkbox'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import ExportButton from '../../components/ui/ExportButton'
import { FormAlert } from '../../components/ui/FormLayout'
import { Input } from '../../components/ui/input'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
import type { GetSparePartsData, SparePart } from '../../graphql/spare-parts/types'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

/** Mesma regra da notificação LOW_STOCK e da planilha de estoque. */
function isLowStock(part: Pick<SparePart, 'quantity' | 'minimumStock'>): boolean {
  return part.quantity < part.minimumStock
}

const COLUMNS: readonly DataTableColumn<SparePart>[] = [
  {
    key: 'code',
    header: 'Código',
    link: true,
    className: 'w-32',
    cell: (p) => <span className="font-mono font-medium">{p.partNumber}</span>,
  },
  {
    key: 'name',
    header: 'Nome',
    mobile: 'title',
    cell: (p) => (
      <span className="flex flex-col">
        <span className="font-medium">{p.name}</span>
        {p.description && <span className="line-clamp-1 text-xs text-quiet max-sm:hidden">{p.description}</span>}
      </span>
    ),
  },
  {
    key: 'stock',
    header: 'Estoque',
    align: 'right',
    cell: (p) => (
      <span className="inline-flex items-center gap-2">
        {isLowStock(p) && <Badge variant="error">Abaixo do mínimo</Badge>}
        <span className={isLowStock(p) ? 'font-mono font-semibold text-error' : 'font-mono'}>{p.quantity}</span>
      </span>
    ),
  },
  { key: 'min', header: 'Mínimo', align: 'right', mobile: 'hidden', cell: (p) => <span className="font-mono text-quiet">{p.minimumStock}</span> },
  {
    key: 'cost',
    header: 'Custo unit.',
    align: 'right',
    mobile: 'hidden',
    cell: (p) => <span className="font-mono">{p.unitCost != null ? BRL.format(p.unitCost) : '—'}</span>,
  },
]

export default function SparePartsListPage() {
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [search, setSearch] = useState('')
  const [lowStockOnly, setLowStockOnly] = useState(false)
  const { data, loading, error } = useQuery<GetSparePartsData>(GET_SPARE_PARTS, {
    fetchPolicy: 'cache-and-network',
  })

  const all = data?.spareParts ?? []
  const term = search.toLowerCase()
  const filtered = all.filter(
    (p) =>
      (p.name.toLowerCase().includes(term) || p.partNumber.toLowerCase().includes(term)) &&
      (!lowStockOnly || isLowStock(p)),
  )
  const lowStock = all.filter(isLowStock).length
  const canCreate = hasPermission('sparepart.create')

  return (
    <Sheet>
      <SheetHeader
        eyebrow="Cadastros"
        title="Peças de Reposição"
        actions={
          <>
            <Input
              placeholder="Buscar por nome ou código…"
              aria-label="Buscar peças"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-64 max-w-full"
            />
            <label htmlFor="low-stock-only" className="flex items-center gap-2 text-sm text-body">
              <Checkbox
                id="low-stock-only"
                checked={lowStockOnly}
                onCheckedChange={(checked) => setLowStockOnly(checked === true)}
              />
              Apenas estoque baixo
            </label>
            <ExportButton
              path="spare-parts"
              params={{ search: search.trim() || undefined, lowStockOnly: lowStockOnly ? 'true' : undefined }}
              fallbackName="estoque-de-pecas"
            />
            {canCreate && <Button onClick={() => navigate('/dashboard/spare-parts/new')}>Cadastrar peça</Button>}
          </>
        }
      >
        {data && (
          <span className="flex flex-wrap items-center gap-2 font-mono text-xs text-quiet">
            {all.length} {all.length === 1 ? 'item' : 'itens'}
            {lowStock > 0 && <Badge variant="error">{lowStock} abaixo do mínimo</Badge>}
          </span>
        )}
      </SheetHeader>

      {error ? (
        <FormAlert className="mb-5">Erro ao carregar peças: {error.message}</FormAlert>
      ) : (
        <DataTable
          label="Peças de reposição"
          columns={COLUMNS}
          rows={filtered}
          getRowKey={(p) => p.id}
          rowHref={(p) => `/dashboard/spare-parts/${p.id}/edit`}
          loading={loading && !data}
          empty={
            <EmptyState
              message={
                search
                  ? `Nenhuma peça encontrada para "${search}".`
                  : lowStockOnly
                    ? 'Nenhuma peça abaixo do estoque mínimo.'
                    : 'Nenhuma peça cadastrada.'
              }
              action={
                canCreate && !search && !lowStockOnly ? (
                  <Link to="/dashboard/spare-parts/new">Cadastrar peça</Link>
                ) : undefined
              }
            />
          }
        />
      )}
    </Sheet>
  )
}
