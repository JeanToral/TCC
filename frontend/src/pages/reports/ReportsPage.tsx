import type { ComponentType } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'

import ReportFilters from '../../components/reports/ReportFilters'
import ExportButton from '../../components/ui/ExportButton'
import { useAuth } from '../../contexts/AuthContext'
import type { DashboardFilterInput } from '../../graphql/dashboard/types'
import { useReportFilters } from '../../hooks/useReportFilters'
import CostsReport from './CostsReport'
import ReliabilityReport from './ReliabilityReport'
import SlaReport from './SlaReport'
import StockReport from './StockReport'
import WorkOrdersReport from './WorkOrdersReport'
import './ReportsPage.css'

interface ReportTab {
  readonly id: string
  readonly label: string
  /** Endpoint `GET /export/<path>` — ver ADR 0002. */
  readonly exportPath: string
  readonly exportName: string
  /** Além de dashboard.read, que vale para a tela inteira. */
  readonly permission?: string
  readonly Component: ComponentType<{ readonly filter: DashboardFilterInput }>
}

const TABS: readonly ReportTab[] = [
  {
    id: 'work-orders',
    label: 'Ordens de Serviço',
    exportPath: 'work-orders',
    exportName: 'ordens-de-servico',
    Component: WorkOrdersReport,
  },
  {
    id: 'reliability',
    label: 'Confiabilidade',
    exportPath: 'reliability',
    exportName: 'confiabilidade',
    Component: ReliabilityReport,
  },
  {
    id: 'sla',
    label: 'SLA',
    exportPath: 'sla-breaches',
    exportName: 'sla-estourado',
    Component: SlaReport,
  },
  {
    id: 'costs',
    label: 'Custos',
    exportPath: 'asset-costs',
    exportName: 'custos-por-ativo',
    permission: 'cost.read',
    Component: CostsReport,
  },
  {
    id: 'stock',
    label: 'Estoque',
    exportPath: 'stock-consumption',
    exportName: 'consumo-de-pecas',
    Component: StockReport,
  },
]

export default function ReportsPage() {
  const { tab } = useParams<{ tab: string }>()
  const { hasPermission } = useAuth()
  const filters = useReportFilters()

  if (!hasPermission('dashboard.read')) {
    return (
      <div className="page-error" role="alert">
        Você não tem permissão para ver os relatórios.
      </div>
    )
  }

  const tabs = TABS.filter((t) => !t.permission || hasPermission(t.permission))
  const current = tabs.find((t) => t.id === tab)
  if (!current) {
    return <Navigate to={`/dashboard/reports/${tabs[0].id}${filters.search}`} replace />
  }

  const { filter } = filters
  const exportParams = { assetId: filter.assetId, from: filter.from, to: filter.to }
  const { Component } = current

  return (
    <div className="reports-page">
      <header className="page-header">
        <div className="page-header__info">
          <h1 className="page-header__title">Relatórios</h1>
          <span className="page-header__count">{current.label}</span>
        </div>
        <div className="page-header__actions">
          <ExportButton
            path={current.exportPath}
            params={exportParams}
            fallbackName={current.exportName}
          />
        </div>
      </header>

      <nav className="report-tabs" aria-label="Relatórios">
        {tabs.map((t) => (
          <NavLink
            key={t.id}
            to={`/dashboard/reports/${t.id}${filters.search}`}
            className={({ isActive }) => `report-tabs__tab${isActive ? ' report-tabs__tab--active' : ''}`}
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <ReportFilters filters={filters} />

      <Component filter={filter} />
    </div>
  )
}
