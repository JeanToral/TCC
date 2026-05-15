import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Button from '../../components/ui/Button'
import { Input } from '../../components/ui/input'
import Spinner from '../../components/ui/Spinner'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { Asset, GetAssetsData } from '../../graphql/assets/types'
import './AssetsListPage.css'

function formatDate(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('pt-BR').format(new Date(iso))
}

function AssetRow({ asset }: { readonly asset: Asset }) {
  const navigate = useNavigate()
  return (
    <tr
      className="assets-table__row"
      onClick={() => navigate(`/dashboard/assets/${asset.id}`)}
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/dashboard/assets/${asset.id}`)}
      role="link"
      aria-label={`Ver detalhes de ${asset.name}`}
    >
      <td className="assets-table__cell assets-table__cell--tag">
        <span className="assets-table__tag">{asset.tag}</span>
      </td>
      <td className="assets-table__cell">
        <span className="assets-table__name">{asset.name}</span>
        {asset.location && (
          <span className="assets-table__location">{asset.location}</span>
        )}
      </td>
      <td className="assets-table__cell">{asset.manufacturer ?? '—'}</td>
      <td className="assets-table__cell">{asset.model ?? '—'}</td>
      <td className="assets-table__cell assets-table__cell--date">
        {formatDate(asset.installDate)}
      </td>
      <td
        className="assets-table__cell assets-table__cell--actions"
        onClick={(e) => e.stopPropagation()}
      >
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/assets/${asset.id}`)}
        >
          Ver
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate(`/dashboard/assets/${asset.id}/edit`)}
        >
          Editar
        </Button>
      </td>
    </tr>
  )
}

export default function AssetsListPage() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const { data, loading, error } = useQuery<GetAssetsData>(GET_ASSETS, {
    fetchPolicy: 'cache-and-network',
  })

  const filtered = (data?.assets ?? []).filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.tag.toLowerCase().includes(search.toLowerCase()) ||
      (a.manufacturer ?? '').toLowerCase().includes(search.toLowerCase()),
  )

  return (
    <div className="assets-list-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Ativos</h1>
          {data && (
            <span className="page-header__count">
              {data.assets.length} {data.assets.length === 1 ? 'ativo' : 'ativos'}
            </span>
          )}
        </div>
        <div className="page-header__actions">
          <Input
            placeholder="Buscar por nome, tag ou fabricante…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="assets-list-page__search"
          />
          <Button onClick={() => navigate('/dashboard/assets/new')}>
            Novo Ativo
          </Button>
        </div>
      </header>

      {loading && !data && (
        <div className="page-loading"><Spinner size="lg" /></div>
      )}

      {error && (
        <div className="page-error" role="alert">
          Erro ao carregar ativos: {error.message}
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="page-empty">
          {search ? (
            <p>Nenhum ativo encontrado para "{search}".</p>
          ) : (
            <p>Nenhum ativo cadastrado ainda.</p>
          )}
        </div>
      )}

      {filtered.length > 0 && (
        <div className="assets-table-card">
          <table className="assets-table">
            <thead>
              <tr>
                <th className="assets-table__th">Tag</th>
                <th className="assets-table__th">Nome / Localização</th>
                <th className="assets-table__th">Fabricante</th>
                <th className="assets-table__th">Modelo</th>
                <th className="assets-table__th">Instalação</th>
                <th className="assets-table__th" aria-label="Ações" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((asset) => (
                <AssetRow key={asset.id} asset={asset} />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
