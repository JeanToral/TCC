import { useQuery } from '@apollo/client/react'

import { ChartGrid } from '../../components/charts/ChartCard'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import { SheetSection } from '../../components/ui/Sheet'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import type { AssetKpi, DashboardFilterInput, GetDashboardKpisData } from '../../graphql/dashboard/types'
import { splitHours } from '../../lib/period'
import { MttrChart } from '../dashboard/DashboardCharts'

function hours(value: number | null): string {
  const { value: v, unit } = splitHours(value)
  return v === null ? '—' : `${v} ${unit}`
}

const COLUMNS: readonly DataTableColumn<AssetKpi>[] = [
  { key: 'asset', header: 'Ativo', link: true, mobile: 'title', cell: (k) => <span className="font-medium">{k.assetName}</span> },
  { key: 'mttr', header: 'MTTR', align: 'right', cell: (k) => hours(k.mttr) },
  { key: 'mtbf', header: 'MTBF', align: 'right', cell: (k) => hours(k.mtbf) },
  { key: 'completed', header: 'Corretivas concluídas', align: 'right', cell: (k) => k.completedWorkOrders },
  { key: 'total', header: 'OS totais', align: 'right', mobile: 'hidden', cell: (k) => k.totalWorkOrders },
]

interface ReportTabProps {
  readonly filter: DashboardFilterInput
}

export default function ReliabilityReport({ filter }: ReportTabProps) {
  const { data, loading, error } = useQuery<GetDashboardKpisData>(GET_DASHBOARD_KPIS, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })
  const kpis = [...(data?.dashboardKpis ?? [])].sort((a, b) => (b.mttr ?? -1) - (a.mttr ?? -1))

  return (
    <>
      <ChartGrid>
        <MttrChart kpis={kpis} loading={loading} />
      </ChartGrid>

      <SheetSection
        title="Confiabilidade por ativo"
        hint="MTTR: média de (conclusão − início) das corretivas concluídas no período. MTBF: média do intervalo entre o fim de uma corretiva e o início da seguinte — exige ao menos duas falhas."
        flush
      >
        {error ? (
          <FormAlert className="mb-5">{error.message}</FormAlert>
        ) : (
          <DataTable
            label="Confiabilidade por ativo"
            columns={COLUMNS}
            rows={kpis}
            getRowKey={(k) => k.assetId}
            rowHref={(k) => `/dashboard/assets/${k.assetId}`}
            loading={loading && !data}
            empty={<EmptyState message="Nenhuma OS corretiva concluída no período." />}
          />
        )}
      </SheetSection>
    </>
  )
}
