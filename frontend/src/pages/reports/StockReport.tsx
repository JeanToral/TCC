import { useQuery } from '@apollo/client/react'

import Spinner from '../../components/ui/Spinner'
import { GET_STOCK_REPORT } from '../../graphql/dashboard/GetStockReport.gql'
import type { DashboardFilterInput, GetStockReportData } from '../../graphql/dashboard/types'

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

  if (loading && !data) {
    return (
      <div className="page-loading">
        <Spinner />
      </div>
    )
  }
  if (error) return <div className="page-error" role="alert">{error.message}</div>

  return (
    <>
      <section className="report-section" aria-label="Peças abaixo do mínimo">
        <h2 className="report-section__title">Peças abaixo do mínimo</h2>
        <p className="report-section__hint">Saldo de agora — não depende do período nem do ativo.</p>

        {below.length === 0 ? (
          <p className="report-empty">Nenhuma peça abaixo do estoque mínimo.</p>
        ) : (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Peça</th>
                  <th className="report-table__num">Saldo</th>
                  <th className="report-table__num">Mínimo</th>
                  <th className="report-table__num">Faltam</th>
                </tr>
              </thead>
              <tbody>
                {below.map((r) => (
                  <tr key={r.sparePartId}>
                    <td><code>{r.partNumber}</code></td>
                    <td>{r.name}</td>
                    <td className="report-table__num">{r.quantity}</td>
                    <td className="report-table__num">{r.minimumStock}</td>
                    <td className="report-table__num report-table__num--strong">
                      {r.minimumStock - r.quantity}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="report-section" aria-label="Consumo no período">
        <h2 className="report-section__title">Consumo no período</h2>
        <p className="report-section__hint">Peças baixadas em OS concluídas no período e no ativo filtrados.</p>

        {consumed.length === 0 ? (
          <p className="report-empty">Nenhuma peça consumida no período.</p>
        ) : (
          <div className="report-table-wrap">
            <table className="report-table">
              <thead>
                <tr>
                  <th>Código</th>
                  <th>Peça</th>
                  <th className="report-table__num">Consumido</th>
                  <th className="report-table__num">OS</th>
                  <th className="report-table__num">Saldo atual</th>
                </tr>
              </thead>
              <tbody>
                {consumed.map((r) => (
                  <tr key={r.sparePartId}>
                    <td><code>{r.partNumber}</code></td>
                    <td>{r.name}</td>
                    <td className="report-table__num report-table__num--strong">{r.consumed}</td>
                    <td className="report-table__num">{r.workOrders}</td>
                    <td className="report-table__num">{r.quantity}</td>
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
