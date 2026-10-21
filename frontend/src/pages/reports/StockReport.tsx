import { useQuery } from '@apollo/client/react'

import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import { SheetSection } from '../../components/ui/Sheet'
import { GET_STOCK_REPORT } from '../../graphql/dashboard/GetStockReport.gql'
import type { DashboardFilterInput, GetStockReportData, StockReportRow } from '../../graphql/dashboard/types'

const code: DataTableColumn<StockReportRow> = {
  key: 'code',
  header: 'Código',
  link: true,
  className: 'w-32',
  cell: (r) => <span className="font-mono font-medium">{r.partNumber}</span>,
}
const name: DataTableColumn<StockReportRow> = { key: 'name', header: 'Peça', mobile: 'title', cell: (r) => r.name }

const BELOW_COLUMNS: readonly DataTableColumn<StockReportRow>[] = [
  code,
  name,
  { key: 'qty', header: 'Saldo', align: 'right', cell: (r) => r.quantity },
  { key: 'min', header: 'Mínimo', align: 'right', cell: (r) => r.minimumStock },
  {
    key: 'missing',
    header: 'Faltam',
    align: 'right',
    cell: (r) => <span className="font-semibold text-error">{r.minimumStock - r.quantity}</span>,
  },
]

const CONSUMED_COLUMNS: readonly DataTableColumn<StockReportRow>[] = [
  code,
  name,
  { key: 'consumed', header: 'Consumido', align: 'right', cell: (r) => <span className="font-semibold">{r.consumed}</span> },
  { key: 'wos', header: 'OS', align: 'right', cell: (r) => r.workOrders },
  { key: 'qty', header: 'Saldo atual', align: 'right', mobile: 'hidden', cell: (r) => r.quantity },
]

const partHref = (r: StockReportRow) => `/dashboard/spare-parts/${r.sparePartId}/edit`

interface ReportTabProps {
  readonly filter: DashboardFilterInput
}

export default function StockReport({ filter }: ReportTabProps) {
  const { data, loading, error } = useQuery<GetStockReportData>(GET_STOCK_REPORT, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })
  const rows = data?.stockReport ?? []
  const below = rows.filter((r) => r.belowMinimum)
  const consumed = rows.filter((r) => r.consumed > 0).sort((a, b) => b.consumed - a.consumed)
  const firstLoad = loading && !data

  if (error) return <FormAlert className="mb-5">{error.message}</FormAlert>

  return (
    <>
      <SheetSection title="Peças abaixo do mínimo" hint="Saldo de agora — não depende do período nem do ativo." flush>
        <DataTable
          label="Peças abaixo do mínimo"
          columns={BELOW_COLUMNS}
          rows={below}
          getRowKey={(r) => r.sparePartId}
          rowHref={partHref}
          loading={firstLoad}
          empty={<EmptyState message="Nenhuma peça abaixo do estoque mínimo." />}
        />
      </SheetSection>

      <SheetSection title="Consumo no período" hint="Peças baixadas em OS concluídas no período e no ativo filtrados." flush>
        <DataTable
          label="Consumo no período"
          columns={CONSUMED_COLUMNS}
          rows={consumed}
          getRowKey={(r) => r.sparePartId}
          rowHref={partHref}
          loading={firstLoad}
          empty={<EmptyState message="Nenhuma peça consumida no período." />}
        />
      </SheetSection>
    </>
  )
}
