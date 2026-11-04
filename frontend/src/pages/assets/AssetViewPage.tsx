import { useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { usePageCrumb } from '../../components/layout/Breadcrumbs'
import Button from '../../components/ui/Button'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import Modal from '../../components/ui/Modal'
import MoreActions from '../../components/ui/MoreActions'
import Readout, { ReadoutStrip } from '../../components/ui/Readout'
import { Sheet, SheetHeader, SheetSection } from '../../components/ui/Sheet'
import Skeleton from '../../components/ui/Skeleton'
import { useAuth } from '../../contexts/AuthContext'
import { DELETE_ASSET } from '../../graphql/assets/DeleteAsset.gql'
import { GET_ASSET } from '../../graphql/assets/GetAsset.gql'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { AssetDetail, DeleteAssetData, GetAssetData } from '../../graphql/assets/types'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import type { GetDashboardKpisData } from '../../graphql/dashboard/types'
import { GET_ASSET_COSTS } from '../../graphql/finance/GetAssetCosts.gql'
import type { GetAssetCostsData } from '../../graphql/finance/types'
import { formatDay, splitHours } from '../../lib/period'
import { errorMessage } from '../../lib/utils'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
function formatDate(iso: string | null): string {
  return iso ? formatDay(iso) : '—'
}

// ── Indicadores (dashboard.read) ───────────────────────────
function AssetIndicators({ assetId }: { readonly assetId: number }) {
  const { data, loading } = useQuery<GetDashboardKpisData>(GET_DASHBOARD_KPIS, {
    variables: { filter: { assetId } },
  })
  const kpi = data?.dashboardKpis.find((k) => k.assetId === assetId)
  const mtbf = splitHours(kpi?.mtbf ?? null)
  const mttr = splitHours(kpi?.mttr ?? null)

  return (
    <SheetSection title="Indicadores" flush>
      {loading ? (
        <div className="flex gap-4 px-5 pb-5">
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
          <Skeleton className="h-12 flex-1" />
        </div>
      ) : (
        <ReadoutStrip className="border-t border-rule">
          <Readout label="MTBF" value={mtbf.value} unit={mtbf.unit} detail="Tempo médio entre falhas" />
          <Readout label="MTTR" value={mttr.value} unit={mttr.unit} detail="Tempo médio de reparo" />
          <Readout
            label="Corretivas concluídas"
            value={String(kpi?.completedWorkOrders ?? 0)}
            detail={`de ${kpi?.totalWorkOrders ?? 0} OS registradas`}
          />
        </ReadoutStrip>
      )}
    </SheetSection>
  )
}

// ── Custo (cost.read) ──────────────────────────────────────
function twelveMonthsAgo(): string {
  const from = new Date()
  from.setMonth(from.getMonth() - 12)
  from.setHours(0, 0, 0, 0)
  return from.toISOString()
}

function AssetCost({ assetId }: { readonly assetId: number }) {
  // Fixada na montagem: recalcular a cada render muda as variáveis e refaz a query em laço.
  const [from] = useState(twelveMonthsAgo)

  const { data, loading } = useQuery<GetAssetCostsData>(GET_ASSET_COSTS, {
    variables: { filter: { assetId, from } },
  })
  const cost = data?.assetCosts?.[0]
  const incomplete = cost?.workOrdersWithIncompleteCost ?? 0

  return (
    <SheetSection
      title="Custo de manutenção — 12 meses"
      aside={
        <Link to={`/dashboard/reports/costs?assetId=${assetId}`} className="text-xs">
          Ver detalhamento
        </Link>
      }
    >
      {loading ? (
        <Skeleton className="h-16" />
      ) : (
        <dl className="flex flex-col text-sm">
          {[
            { label: 'Corretiva', value: cost?.realizedCorrectiveCost },
            { label: 'Preventiva', value: cost?.realizedPreventiveCost },
          ].map((line) => (
            <div key={line.label} className="flex justify-between gap-4 py-1 text-body">
              <dt>{line.label}</dt>
              <dd className="font-mono tabular-nums">{BRL.format(line.value ?? 0)}</dd>
            </div>
          ))}
          <div className="mt-1 flex justify-between gap-4 border-t-2 border-ink pt-2 font-semibold text-ink">
            <dt>Realizado</dt>
            <dd className="font-mono tabular-nums">{BRL.format(cost?.realizedTotal ?? 0)}</dd>
          </div>
          <div className="flex justify-between gap-4 py-1 text-quiet">
            <dt>Previsto (OS abertas)</dt>
            <dd className="font-mono tabular-nums">{BRL.format(cost?.forecastTotal ?? 0)}</dd>
          </div>
          {incomplete > 0 && (
            <p className="mt-2 border-l-[3px] border-warning bg-warning-soft px-3 py-1.5 text-xs text-[var(--warning-text)]" role="status">
              {incomplete} de {cost?.completedWorkOrders} OS com custo incompleto.
            </p>
          )}
        </dl>
      )}
    </SheetSection>
  )
}

// ── Plaqueta ───────────────────────────────────────────────
/** A placa de identificação da máquina: os dados que estão rebitados nela. */
function NamePlate({ asset }: { readonly asset: AssetDetail }) {
  const rows = [
    { label: 'Fabricante', value: asset.manufacturer },
    { label: 'Modelo', value: asset.model },
    { label: 'Nº de série', value: asset.serialNumber, mono: true },
    { label: 'Instalação', value: asset.installDate ? formatDate(asset.installDate) : null, mono: true },
    { label: 'Localização', value: asset.location },
  ]
  return (
    <figure aria-label="Plaqueta de identificação" className="rounded-xs border-2 border-rule-strong bg-subtle p-1">
      <div className="rounded-[1px] border border-rule-strong px-3 py-2.5">
        <span className="block font-mono text-lg font-semibold tracking-wide text-ink">{asset.tag}</span>
        <span className="block border-b border-rule-strong pb-2 text-sm text-body">{asset.name}</span>
        <dl className="mt-2 flex flex-col gap-1">
          {rows.map((row) => (
            <div key={row.label} className="flex justify-between gap-3 text-xs">
              <dt className="uppercase tracking-wider text-faint">{row.label}</dt>
              <dd className={row.mono ? 'font-mono text-ink' : 'text-right text-ink'}>{row.value ?? '—'}</dd>
            </div>
          ))}
        </dl>
      </div>
    </figure>
  )
}

// ── Page ───────────────────────────────────────────────────
export default function AssetViewPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { hasPermission } = useAuth()
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const { data, loading, error } = useQuery<GetAssetData>(GET_ASSET, {
    variables: { id: Number(id) },
    skip: !id,
  })
  usePageCrumb(data?.asset?.tag)

  const [deleteAsset, { loading: deleting }] = useMutation<DeleteAssetData>(DELETE_ASSET, {
    variables: { id: Number(id) },
    refetchQueries: [{ query: GET_ASSETS }],
    onCompleted: () => navigate('/dashboard/assets'),
    onError: (e) => setDeleteError(errorMessage(e)),
  })

  if (loading) {
    return (
      <Sheet>
        <div className="flex flex-col gap-3 p-5" role="status" aria-label="Carregando">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-6 w-32" />
          <Skeleton className="w-72 max-w-full" />
        </div>
      </Sheet>
    )
  }

  if (error || !data?.asset) {
    return (
      <Sheet>
        <EmptyState
          message={error ? `Erro ao carregar o ativo: ${error.message}` : 'Ativo não encontrado.'}
          action={<Link to="/dashboard/assets">Voltar para Ativos</Link>}
        />
      </Sheet>
    )
  }

  const asset = data.asset

  return (
    <>
      <Sheet>
        <SheetHeader
          eyebrow="Ativo"
          code={asset.tag}
          title={asset.name}
          meta={[
            { label: 'Localização', value: asset.location ?? '—' },
            { label: 'Instalação', value: <span className="font-mono">{formatDate(asset.installDate)}</span> },
          ]}
          actions={
            <>
              {hasPermission('asset.update') && (
                <Button variant="secondary" onClick={() => navigate(`/dashboard/assets/${asset.id}/edit`)}>
                  Editar
                </Button>
              )}
              <MoreActions
                align="start"
                items={[
                  {
                    label: 'Remover ativo',
                    danger: true,
                    onSelect: () => {
                      setDeleteError('')
                      setDeleteOpen(true)
                    },
                    disabledReason: hasPermission('asset.delete') ? undefined : 'Você não tem permissão para esta ação',
                  },
                ]}
              />
            </>
          }
        />

        <div className="grid lg:grid-cols-[minmax(0,1fr)_18rem]">
          <div className="min-w-0">
            {hasPermission('dashboard.read') && <AssetIndicators assetId={asset.id} />}
            {hasPermission('cost.read') && <AssetCost assetId={asset.id} />}
          </div>

          <aside className="border-t border-rule lg:border-t-0 lg:border-l" aria-label="Identificação">
            <SheetSection title="Plaqueta">
              <NamePlate asset={asset} />
            </SheetSection>
            <SheetSection title="Documento">
              <dl className="flex flex-col gap-2.5 text-sm">
                {[
                  { label: 'Cadastrado em', value: asset.createdAt },
                  { label: 'Atualizado em', value: asset.updatedAt },
                ].map((item) => (
                  <div key={item.label} className="flex flex-col gap-0.5">
                    <dt className="text-[0.6875rem] font-medium uppercase tracking-wider text-faint">{item.label}</dt>
                    <dd className="font-mono tabular-nums text-ink">{DATE_TIME.format(new Date(item.value))}</dd>
                  </div>
                ))}
              </dl>
            </SheetSection>
          </aside>
        </div>
      </Sheet>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Remover ativo"
        size="sm"
        footer={
          <>
            <Button variant="link" onClick={() => setDeleteOpen(false)} disabled={deleting}>
              Cancelar
            </Button>
            <Button variant="danger" loading={deleting} onClick={() => deleteAsset()}>
              Confirmar remoção
            </Button>
          </>
        }
      >
        <p className="text-sm leading-relaxed text-body">
          Tem certeza que deseja remover o ativo <strong>{asset.name}</strong> (
          <span className="font-mono">{asset.tag}</span>)? As ordens de serviço vinculadas serão preservadas.
        </p>
        {deleteError && <FormAlert className="m-0 mt-3">{deleteError}</FormAlert>}
      </Modal>
    </>
  )
}
