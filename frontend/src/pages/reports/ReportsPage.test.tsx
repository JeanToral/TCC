import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import type { DocumentNode } from 'graphql'
import { describe, expect, it, vi } from 'vitest'

import ReportsPage from './ReportsPage'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import { GET_DASHBOARD_MONTHLY_TREND } from '../../graphql/dashboard/GetDashboardMonthlyTrend.gql'
import { GET_DASHBOARD_STATUS_COUNTS } from '../../graphql/dashboard/GetDashboardStatusCounts.gql'
import { GET_SLA_BREACHES } from '../../graphql/dashboard/GetSlaBreaches.gql'
import { GET_STOCK_REPORT } from '../../graphql/dashboard/GetStockReport.gql'
import type { DashboardFilterInput } from '../../graphql/dashboard/types'
import { GET_ASSET_COSTS } from '../../graphql/finance/GetAssetCosts.gql'
import { GET_MONTHLY_COSTS } from '../../graphql/finance/GetMonthlyCosts.gql'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import { downloadExport } from '../../lib/download'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('../../lib/download', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../lib/download')>()
  return { ...actual, downloadExport: vi.fn().mockResolvedValue(undefined) }
})

// ── Fixtures ───────────────────────────────────────────────
const ASSET = {
  __typename: 'AssetType',
  id: 3,
  name: 'Injetora 03',
  tag: 'INJ-003',
  location: 'Galpão B',
  manufacturer: null,
  model: null,
  serialNumber: null,
  installDate: null,
  createdAt: '2026-01-01T00:00:00.000Z',
}

const WORK_ORDER = {
  __typename: 'WorkOrder',
  id: 41,
  title: 'Troca de rolamento',
  type: 'CORRECTIVE',
  priority: 'HIGH',
  status: 'COMPLETED',
  assetId: 3,
  asset: { __typename: 'AssetType', id: 3, name: 'Injetora 03', tag: 'INJ-003', location: 'Galpão B' },
  requestedById: 1,
  requestedBy: { __typename: 'UserType', id: 1, name: 'Ana', email: 'ana@cmms.local' },
  assignedToId: null,
  assignedTo: null,
  scheduledStart: null,
  createdAt: '2025-05-10T12:00:00.000Z',
}

const BREACH = {
  __typename: 'SlaBreach',
  workOrderId: 41,
  title: 'Troca de rolamento',
  assetId: 3,
  assetTag: 'INJ-003',
  assetName: 'Injetora 03',
  priority: 'CRITICAL',
  type: 'CORRECTIVE',
  createdAt: '2025-05-10T12:00:00.000Z',
  startedAt: '2025-05-10T17:00:00.000Z',
  completedAt: '2025-05-11T12:00:00.000Z',
  limitHours: 2,
  delayHours: 3,
}

const STOCK = [
  { sparePartId: 1, partNumber: 'ROL-6205', name: 'Rolamento', quantity: 2, minimumStock: 10, belowMinimum: true, consumed: 0, workOrders: 0 },
  { sparePartId: 2, partNumber: 'FLT-AR01', name: 'Filtro de ar', quantity: 20, minimumStock: 6, belowMinimum: false, consumed: 7, workOrders: 3 },
].map((r) => ({ __typename: 'StockReportRow', ...r }))

const KPI = {
  __typename: 'AssetKpi',
  assetId: 3,
  assetName: 'Injetora 03',
  mtbf: 720,
  mttr: 4.5,
  totalWorkOrders: 6,
  completedWorkOrders: 2,
}

// ── Helpers ───────────────────────────────────────────────
type Captured = Map<DocumentNode, DashboardFilterInput[]>

function mock(query: DocumentNode, data: Record<string, unknown>, captured?: Captured) {
  return {
    request: {
      query,
      variables: (vars: { filter?: DashboardFilterInput }) => {
        if (captured && vars.filter) captured.set(query, [...(captured.get(query) ?? []), vars.filter])
        return true
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data },
  } satisfies MockLink.MockedResponse
}

function mocks(captured?: Captured): MockLink.MockedResponse[] {
  return [
    mock(GET_ASSETS, { assets: [ASSET] }),
    mock(GET_DASHBOARD_STATUS_COUNTS, { dashboardStatusCounts: [] }, captured),
    mock(GET_DASHBOARD_MONTHLY_TREND, { dashboardMonthlyTrend: [] }, captured),
    mock(
      GET_WORK_ORDERS,
      {
        workOrders: {
          __typename: 'WorkOrderConnection',
          edges: [{ __typename: 'WorkOrderEdge', cursor: 'c41', node: WORK_ORDER }],
          pageInfo: { __typename: 'PageInfo', hasNextPage: false, endCursor: 'c41' },
        },
      },
      captured,
    ),
    mock(GET_DASHBOARD_KPIS, { dashboardKpis: [KPI] }, captured),
    mock(GET_SLA_BREACHES, { slaBreaches: [BREACH] }, captured),
    mock(GET_STOCK_REPORT, { stockReport: STOCK }, captured),
    mock(GET_ASSET_COSTS, { assetCosts: [] }, captured),
    mock(GET_MONTHLY_COSTS, { monthlyCosts: [] }, captured),
  ]
}

const ROUTE = '/dashboard/reports/:tab?'
const READER = ['dashboard.read', 'workorder.read']

describe('ReportsPage', () => {
  it('deve abrir na aba Ordens de Serviço quando a URL não traz aba', async () => {
    // Arrange / Act
    renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports',
      path: ROUTE,
      mocks: mocks(),
      permissions: READER,
    })

    // Assert
    expect(await screen.findByRole('link', { name: 'Ordens de Serviço' })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(await screen.findByRole('link', { name: 'Troca de rolamento' })).toHaveAttribute(
      'href',
      '/dashboard/work-orders/41',
    )
  })

  it('deve esconder a aba Custos de quem não tem cost.read', async () => {
    // Arrange / Act
    renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports/sla',
      path: ROUTE,
      mocks: mocks(),
      permissions: READER,
    })

    // Assert
    const tabs = await screen.findByRole('navigation', { name: 'Relatórios' })
    expect(within(tabs).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Ordens de Serviço',
      'Confiabilidade',
      'SLA',
      'Estoque',
    ])
  })

  it('deve mostrar a aba Custos para quem tem cost.read', async () => {
    // Arrange / Act
    renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports/costs',
      path: ROUTE,
      mocks: mocks(),
      permissions: [...READER, 'cost.read'],
    })

    // Assert
    expect(await screen.findByRole('link', { name: 'Custos' })).toHaveAttribute('aria-current', 'page')
  })

  it('deve negar a tela a quem não tem dashboard.read', () => {
    // Arrange / Act
    renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports/sla',
      path: ROUTE,
      mocks: mocks(),
      permissions: ['workorder.read'],
    })

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Você não tem permissão para ver os relatórios.')
  })

  it('deve aplicar os filtros da URL às consultas e manter o recorte nas abas', async () => {
    // Arrange
    const captured: Captured = new Map()

    // Act
    renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports/sla?assetId=3&from=2025-04-01&to=2025-06-30',
      path: ROUTE,
      mocks: mocks(captured),
      permissions: READER,
    })

    // Assert
    expect(await screen.findByText('+3.0h')).toBeInTheDocument()
    expect(captured.get(GET_SLA_BREACHES)?.[0]).toEqual({
      assetId: 3,
      from: new Date(2025, 3, 1).toISOString(),
      to: new Date(2025, 5, 30, 23, 59, 59, 999).toISOString(),
    })
    expect(screen.getByRole('link', { name: 'Estoque' })).toHaveAttribute(
      'href',
      '/dashboard/reports/stock?assetId=3&from=2025-04-01&to=2025-06-30',
    )
    await screen.findByRole('option', { name: 'Injetora 03 (INJ-003)' })
    expect(screen.getByLabelText('Ativo')).toHaveValue('3')
  })

  it('deve restaurar o período padrão', async () => {
    // Arrange
    const { user } = renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports/sla?assetId=3&from=2025-04-01&to=2025-06-30',
      path: ROUTE,
      mocks: mocks(),
      permissions: READER,
    })
    await screen.findByRole('option', { name: 'Injetora 03 (INJ-003)' })

    // Act
    await user.click(screen.getByRole('button', { name: 'Restaurar padrão' }))

    // Assert
    expect(screen.getByLabelText('Ativo')).toHaveValue('')
    expect(screen.getByRole('link', { name: 'Estoque' })).toHaveAttribute('href', '/dashboard/reports/stock')
  })

  it.each([
    ['work-orders', 'work-orders', 'ordens-de-servico'],
    ['reliability', 'reliability', 'confiabilidade'],
    ['sla', 'sla-breaches', 'sla-estourado'],
    ['stock', 'stock-consumption', 'consumo-de-pecas'],
  ])('deve exportar a aba %s pelo endpoint %s com os filtros da tela', async (tab, path, name) => {
    // Arrange
    vi.mocked(downloadExport).mockClear()
    const { user } = renderWithProviders(<ReportsPage />, {
      route: `/dashboard/reports/${tab}?assetId=3&from=2025-04-01&to=2025-06-30`,
      path: ROUTE,
      mocks: mocks(),
      permissions: READER,
    })

    // Act
    await user.click(await screen.findByRole('button', { name: 'Exportar' }))
    await user.click(screen.getByRole('menuitem', { name: /CSV/ }))

    // Assert
    expect(vi.mocked(downloadExport)).toHaveBeenCalledWith(
      path,
      'csv',
      {
        assetId: 3,
        from: new Date(2025, 3, 1).toISOString(),
        to: new Date(2025, 5, 30, 23, 59, 59, 999).toISOString(),
      },
      name,
    )
  })

  it('deve listar MTTR e MTBF por ativo na aba Confiabilidade', async () => {
    // Arrange / Act
    renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports/reliability',
      path: ROUTE,
      mocks: mocks(),
      permissions: READER,
    })

    // Assert
    const section = await screen.findByRole('region', { name: 'Confiabilidade por ativo' })
    const row = await within(section).findByRole('row', { name: /Injetora 03/ })
    expect(row).toHaveTextContent('4.5h')
    expect(row).toHaveTextContent('30.0d')
  })

  it('deve separar peças abaixo do mínimo do consumo no período', async () => {
    // Arrange / Act
    renderWithProviders(<ReportsPage />, {
      route: '/dashboard/reports/stock',
      path: ROUTE,
      mocks: mocks(),
      permissions: READER,
    })

    // Assert
    const below = await screen.findByRole('region', { name: 'Peças abaixo do mínimo' })
    expect(within(below).getByRole('row', { name: /ROL-6205/ })).toHaveTextContent('8')
    expect(within(below).queryByText('FLT-AR01')).not.toBeInTheDocument()

    const consumption = screen.getByRole('region', { name: 'Consumo no período' })
    expect(within(consumption).getByRole('row', { name: /FLT-AR01/ })).toHaveTextContent('7')
    expect(within(consumption).queryByText('ROL-6205')).not.toBeInTheDocument()
  })
})
