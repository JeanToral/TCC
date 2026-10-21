import type { ComponentType } from 'react'
import { Navigate, NavLink, useParams } from 'react-router-dom'

import ReportFilters from '../../components/reports/ReportFilters'
import ExportButton from '../../components/ui/ExportButton'
import { FormAlert } from '../../components/ui/FormLayout'
import { Sheet, SheetHeader } from '../../components/ui/Sheet'
import { useAuth } from '../../contexts/AuthContext'
import type { DashboardFilterInput } from '../../graphql/dashboard/types'
import { useReportFilters } from '../../hooks/useReportFilters'
import { cn } from '../../lib/utils'
import CostsReport from './CostsReport'
import ReliabilityReport from './ReliabilityReport'
import SlaReport from './SlaReport'
import StockReport from './StockReport'
import WorkOrdersReport from './WorkOrdersReport'

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
      <Sheet>
        <SheetHeader eyebrow="Análise" title="Relatórios" />
        <FormAlert className="mb-5">Você não tem permissão para ver os relatórios.</FormAlert>
      </Sheet>
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
    <Sheet>
      <SheetHeader
        eyebrow="Análise"
        title="Relatórios"
        actions={
          <>
            <ReportFilters filters={filters} />
            <ExportButton path={current.exportPath} params={exportParams} fallbackName={current.exportName} />
          </>
        }
      />

      {/* Abas de pasta: a aba aberta se funde à folha abaixo dela. */}
      <nav aria-label="Relatórios" className="flex gap-1 overflow-x-auto border-b border-rule bg-subtle px-5 pt-2">
        {tabs.map((t) => (
          <NavLink
            key={t.id}
            to={`/dashboard/reports/${t.id}${filters.search}`}
            className={({ isActive }) =>
              cn(
                '-mb-px whitespace-nowrap rounded-t-xs border border-b-0 px-3.5 py-2 text-sm hover:no-underline',
                isActive
                  ? 'border-rule bg-sheet font-medium text-ink shadow-[inset_0_2px_0_var(--primary)]'
                  : 'border-transparent text-quiet hover:text-ink',
              )
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>

      <Component filter={filter} />
    </Sheet>
  )
}
