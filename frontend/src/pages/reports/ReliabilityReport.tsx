import { useQuery } from '@apollo/client/react'

import Spinner from '../../components/ui/Spinner'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import type { DashboardFilterInput, GetDashboardKpisData } from '../../graphql/dashboard/types'
import { formatHours } from '../../lib/period'
import { MttrChart } from '../dashboard/DashboardCharts'

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
      <div className="chart-grid">
        <MttrChart kpis={kpis} loading={loading} />
      </div>

      <section className="report-section" aria-label="Confiabilidade por ativo">
        <h2 className="report-section__title">Confiabilidade por ativo</h2>
        <p className="report-section__hint">
          MTTR: média de (conclusão − início) das corretivas concluídas no período. MTBF: média do
          intervalo entre o fim de uma corretiva e o início da seguinte — exige ao menos duas falhas.
        </p>

        {loading && !data && (
          <div className="page-loading">
            <Spinner />
          </div>
        )}
        {error && <div className="page-error" role="alert">{error.message}</div>}
        {data && kpis.length === 0 && (
          <p className="report-empty">Nenhuma OS corretiva concluída no período.</p>
        )}

        {kpis.length > 0 && (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Ativo</th>
                  <th className="report-table__num">MTTR</th>
                  <th className="report-table__num">MTBF</th>
                  <th className="report-table__num">Corretivas concluídas</th>
                  <th className="report-table__num">OS totais</th>
                </tr>
              </thead>
              <tbody>
                {kpis.map((k) => (
                  <tr key={k.assetId}>
                    <td><strong>{k.assetName}</strong></td>
                    <td className="report-table__num">{formatHours(k.mttr)}</td>
                    <td className="report-table__num">{formatHours(k.mtbf)}</td>
                    <td className="report-table__num">{k.completedWorkOrders}</td>
                    <td className="report-table__num">{k.totalWorkOrders}</td>
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
