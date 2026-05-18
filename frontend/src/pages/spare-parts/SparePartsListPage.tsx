import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery, useMutation } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/input'
import Spinner from '../../components/ui/Spinner'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
import { DELETE_SPARE_PART } from '../../graphql/spare-parts/DeleteSparePart.gql'
import type { GetSparePartsData, SparePart } from '../../graphql/spare-parts/types'
import './SparePartsListPage.css'

function StockBadge({ quantity, minimumStock }: { readonly quantity: number; readonly minimumStock: number }) {
  const isLow = quantity <= minimumStock
  return (
    <span className={`stock-badge ${isLow ? 'stock-badge--low' : 'stock-badge--ok'}`}>
      {quantity}
      {isLow && ' ⚠'}
    </span>
  )
}

function SparePartRow({
  part,
  onDelete,
}: {
  readonly part: SparePart
  readonly onDelete: (id: number) => void
}) {
  const navigate = useNavigate()
  return (
    <tr
      className="spare-parts-table__row"
      onClick={() => navigate(`/dashboard/spare-parts/${part.id}/edit`)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/spare-parts/${part.id}/edit`)}
      role="link"
      aria-label={`Editar ${part.name}`}
    >
      <td className="spare-parts-table__cell spare-parts-table__cell--pn">
        <span className="spare-parts-table__pn">{part.partNumber}</span>
      </td>
      <td className="spare-parts-table__cell">
        <span className="spare-parts-table__name">{part.name}</span>
        {part.description && (
          <span className="spare-parts-table__desc">{part.description}</span>
        )}
      </td>
      <td className="spare-parts-table__cell spare-parts-table__cell--center">
        <StockBadge quantity={part.quantity} minimumStock={part.minimumStock} />
      </td>
      <td className="spare-parts-table__cell spare-parts-table__cell--center">
        {part.minimumStock}
      </td>
      <td className="spare-parts-table__cell spare-parts-table__cell--right">
        {part.unitCost != null
          ? new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(part.unitCost)
          : '—'}
      </td>
      <td
        className="spare-parts-table__cell spare-parts-table__cell--actions"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/spare-parts/${part.id}/edit`)}
        >
          Editar
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(part.id)}
        >
          Excluir
        </Button>
      </td>
    </tr>
  )
}

export default function SparePartsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, loading, error } = useQuery<GetSparePartsData>(GET_SPARE_PARTS, {
    fetchPolicy: 'cache-and-network',
  })

  const [deleteSparePart] = useMutation(DELETE_SPARE_PART, {
    refetchQueries: [{ query: GET_SPARE_PARTS }],
  })

  function handleDelete(id: number) {
    if (!window.confirm('Excluir esta peça de reposição?')) return
    deleteSparePart({ variables: { id } }).catch(() => undefined)
  }

  const all = data?.spareParts ?? []
  const filtered = all.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.partNumber.toLowerCase().includes(search.toLowerCase()),
  )

  const lowStock = all.filter((p) => p.quantity <= p.minimumStock).length

  return (
    <div className="spare-parts-list-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Peças de Reposição</h1>
          {data && (
            <div className="page-header__meta">
              <span className="page-header__count">
                {all.length} {all.length === 1 ? 'item' : 'itens'}
              </span>
              {lowStock > 0 && (
                <span className="page-header__alert">
                  ⚠ {lowStock} com estoque baixo
                </span>
              )}
            </div>
          )}
        </div>
        <div className="page-header__actions">
          <Input
            placeholder="Buscar por nome ou código…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="spare-parts-list-page__search"
          />
          <Button onClick={() => navigate('/dashboard/spare-parts/new')}>
            Nova Peça
          </Button>
        </div>
      </header>

      {loading && !data && (
        <div className="page-loading"><Spinner size="lg" /></div>
      )}

      {error && (
        <div className="page-error" role="alert">
          Erro ao carregar peças: {error.message}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="page-empty">
          {search ? (
            <p>Nenhuma peça encontrada para "{search}".</p>
          ) : (
            <p>Nenhuma peça de reposição cadastrada ainda.</p>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="spare-parts-table-card">
          <table className="spare-parts-table">
            <thead>
              <tr>
                <th className="spare-parts-table__th">Código</th>
                <th className="spare-parts-table__th">Nome</th>
                <th className="spare-parts-table__th spare-parts-table__th--center">Estoque</th>
                <th className="spare-parts-table__th spare-parts-table__th--center">Mínimo</th>
                <th className="spare-parts-table__th spare-parts-table__th--right">Custo Unit.</th>
                <th className="spare-parts-table__th" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((part) => (
                <SparePartRow key={part.id} part={part} onDelete={handleDelete} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
