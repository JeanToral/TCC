import { useQuery } from '@apollo/client/react'

import { ChartGrid } from '../../components/charts/ChartCard'
import DataTable, { type DataTableColumn } from '../../components/ui/DataTable'
import EmptyState from '../../components/ui/EmptyState'
import { FormAlert } from '../../components/ui/FormLayout'
import PriorityMark from '../../components/ui/PriorityMark'
import { SheetSection } from '../../components/ui/Sheet'
import { GET_SLA_BREACHES } from '../../graphql/dashboard/GetSlaBreaches.gql'
import type { DashboardFilterInput, GetSlaBreachesData, SlaBreach } from '../../graphql/dashboard/types'
import { splitHours } from '../../lib/period'
import { formatWorkOrderCode } from '../../lib/work-order-labels'
import { SlaTrendChart } from '../dashboard/DashboardCharts'

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

function hours(value: number): string {
  const { value: v, unit } = splitHours(value)
  return `${v} ${unit}`
}

const COLUMNS: readonly DataTableColumn<SlaBreach>[] = [
  {
    key: 'code',
    header: 'Nº',
    link: true,
    className: 'w-24',
    cell: (b) => <span className="font-mono font-medium">{formatWorkOrderCode(b.workOrderId)}</span>,
  },
  { key: 'title', header: 'Título', mobile: 'title', cell: (b) => b.title },
  { key: 'asset', header: 'Ativo', cell: (b) => <span className="font-mono text-[0.8125rem]">{b.assetTag}</span> },
  { key: 'priority', header: 'Prioridade', cell: (b) => <PriorityMark priority={b.priority} /> },
  { key: 'opened', header: 'Aberta em', align: 'right', mobile: 'hidden', cell: (b) => DATE_TIME.format(new Date(b.createdAt)) },
  { key: 'started', header: 'Iniciada em', align: 'right', mobile: 'hidden', cell: (b) => DATE_TIME.format(new Date(b.startedAt)) },
  { key: 'limit', header: 'Prazo', align: 'right', mobile: 'hidden', cell: (b) => hours(b.limitHours) },
  {
    key: 'delay',
    header: 'Atraso',
    align: 'right',
    cell: (b) => <span className="font-semibold text-error">+{hours(b.delayHours)}</span>,
  },
]

interface ReportTabProps {
  readonly filter: DashboardFilterInput
}

export default function SlaReport({ filter }: ReportTabProps) {
  const { data, loading, error } = useQuery<GetSlaBreachesData>(GET_SLA_BREACHES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })

  return (
    <>
      <ChartGrid>
        <SlaTrendChart filter={filter} />
      </ChartGrid>

      <SheetSection
        title="OS que começaram fora do prazo"
        hint="Concluídas no período. Prazo para início: Crítica 2 h, Alta 8 h, Média 48 h, Baixa 7 dias."
        flush
      >
        {error ? (
          <FormAlert className="mb-5">{error.message}</FormAlert>
        ) : (
          <DataTable
            label="OS fora do SLA"
            columns={COLUMNS}
            rows={data?.slaBreaches ?? []}
            getRowKey={(b) => b.workOrderId}
            rowHref={(b) => `/dashboard/work-orders/${b.workOrderId}`}
            loading={loading && !data}
            empty={<EmptyState message="Nenhuma OS concluída no período começou fora do prazo." />}
          />
        )}
      </SheetSection>
    </>
  )
}
