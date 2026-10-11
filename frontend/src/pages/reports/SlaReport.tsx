import { Link } from 'react-router-dom'
import { useQuery } from '@apollo/client/react'

import Badge from '../../components/ui/Badge'
import Spinner from '../../components/ui/Spinner'
import { GET_SLA_BREACHES } from '../../graphql/dashboard/GetSlaBreaches.gql'
import type { DashboardFilterInput, GetSlaBreachesData } from '../../graphql/dashboard/types'
import type { Priority } from '../../graphql/work-orders/types'
import { formatHours } from '../../lib/period'
import { SlaTrendChart } from '../dashboard/DashboardCharts'

const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

const PRIORITY_VARIANT: Record<Priority, 'default' | 'info' | 'warning' | 'error'> = {
  LOW: 'default',
  MEDIUM: 'info',
  HIGH: 'warning',
  CRITICAL: 'error',
}

const DATE_TIME = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' })

interface ReportTabProps {
  readonly filter: DashboardFilterInput
}

export default function SlaReport({ filter }: ReportTabProps) {
  const { data, loading, error } = useQuery<GetSlaBreachesData>(GET_SLA_BREACHES, {
    variables: { filter },
    fetchPolicy: 'cache-and-network',
  })
  const breaches = data?.slaBreaches ?? []

  return (
    <>
      <div className="chart-grid">
        <SlaTrendChart filter={filter} />
      </div>

      <section className="report-section" aria-label="OS fora do SLA">
        <h2 className="report-section__title">OS que começaram fora do prazo</h2>
        <p className="report-section__hint">
          Concluídas no período. Prazo para início: Crítica 2h, Alta 8h, Média 48h, Baixa 7 dias.
        </p>

        {loading && !data && (
          <div className="page-loading">
            <Spinner />
          </div>
        )}
        {error && <div className="page-error" role="alert">{error.message}</div>}
        {data && breaches.length === 0 && (
          <p className="report-empty">Nenhuma OS concluída no período começou fora do prazo.</p>
        )}

        {breaches.length > 0 && (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th className="report-table__num">Nº</th>
                  <th>Título</th>
                  <th>Ativo</th>
                  <th>Prioridade</th>
                  <th className="report-table__num">Aberta em</th>
                  <th className="report-table__num">Iniciada em</th>
                  <th className="report-table__num">Prazo</th>
                  <th className="report-table__num">Atraso</th>
                </tr>
              </thead>
              <tbody>
                {breaches.map((b) => (
                  <tr key={b.workOrderId}>
                    <td className="report-table__num">{b.workOrderId}</td>
                    <td>
                      <Link to={`/dashboard/work-orders/${b.workOrderId}`}>{b.title}</Link>
                    </td>
                    <td>
                      <strong>{b.assetTag}</strong> {b.assetName}
                    </td>
                    <td>
                      <Badge variant={PRIORITY_VARIANT[b.priority]}>{PRIORITY_LABELS[b.priority]}</Badge>
                    </td>
                    <td className="report-table__num">{DATE_TIME.format(new Date(b.createdAt))}</td>
                    <td className="report-table__num">{DATE_TIME.format(new Date(b.startedAt))}</td>
                    <td className="report-table__num">{formatHours(b.limitHours)}</td>
                    <td className="report-table__num report-table__num--strong">
                      +{formatHours(b.delayHours)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </>
  )
}
