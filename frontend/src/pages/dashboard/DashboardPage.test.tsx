import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import type { DocumentNode } from 'graphql'
import { describe, expect, it } from 'vitest'

import DashboardPage from './DashboardPage'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import { GET_DASHBOARD_MONTHLY_TREND } from '../../graphql/dashboard/GetDashboardMonthlyTrend.gql'
import { GET_DASHBOARD_SLA_RATE } from '../../graphql/dashboard/GetDashboardSlaRate.gql'
import { GET_DASHBOARD_STATUS_COUNTS } from '../../graphql/dashboard/GetDashboardStatusCounts.gql'
import { GET_SLA_BREACHES } from '../../graphql/dashboard/GetSlaBreaches.gql'
import { GET_STOCK_REPORT } from '../../graphql/dashboard/GetStockReport.gql'
import type { DashboardFilterInput, MonthlyTrendPoint } from '../../graphql/dashboard/types'
import { GET_MONTHLY_COSTS } from '../../graphql/finance/GetMonthlyCosts.gql'
import { defaultDateRange, toPeriodFilter } from '../../lib/period'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Helpers ───────────────────────────────────────────────
type Captured = DashboardFilterInput[]

function mock(
  query: DocumentNode,
  data: Record<string, unknown>,
  captured?: Captured,
): MockLink.MockedResponse {
  return {
    request: {
      query,
      variables: (vars: { filter?: DashboardFilterInput }) => {
        if (captured && vars.filter) captured.push(vars.filter)
        return true
      },
    },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data },
  }
}

const TREND: (MonthlyTrendPoint & { __typename: string })[] = [
  { month: '2026-09', opened: 4, completed: 2, completedCorrective: 1, completedPreventive: 1, slaWithin: 1, slaTotal: 2, slaPercentage: 50 },
  { month: '2026-10', opened: 1, completed: 3, completedCorrective: 0, completedPreventive: 3, slaWithin: 3, slaTotal: 3, slaPercentage: 100 },
].map((p) => ({ __typename: 'MonthlyTrendPoint', ...p }))

const STATUS = [
  { status: 'REQUESTED', count: 2 },
  { status: 'APPROVED', count: 0 },
  { status: 'SCHEDULED', count: 1 },
  { status: 'IN_PROGRESS', count: 1 },
  { status: 'COMPLETED', count: 5 },
  { status: 'REJECTED', count: 0 },
  { status: 'CANCELLED', count: 0 },
].map((s) => ({ __typename: 'StatusCount', ...s }))

const KPIS = [
  { assetId: 1, assetName: 'Torno CNC #1', mtbf: 720, mttr: 4.5, totalWorkOrders: 6, completedWorkOrders: 2 },
  { assetId: 2, assetName: 'Compressor', mtbf: null, mttr: 7, totalWorkOrders: 4, completedWorkOrders: 1 },
].map((k) => ({ __typename: 'AssetKpi', ...k }))

const COSTS = [
  { month: '2026-09', corrective: 300, preventive: 120, total: 420, workOrdersWithIncompleteCost: 1 },
  { month: '2026-10', corrective: 0, preventive: 80, total: 80, workOrdersWithIncompleteCost: 0 },
].map((c) => ({ __typename: 'MonthlyCostPoint', ...c }))

const STOCK = [
  { sparePartId: 1, partNumber: 'ROL-6205', name: 'Rolamento', quantity: 2, minimumStock: 10, belowMinimum: true, consumed: 0, workOrders: 0 },
  { sparePartId: 2, partNumber: 'FLT-AR01', name: 'Filtro de ar', quantity: 20, minimumStock: 6, belowMinimum: false, consumed: 3, workOrders: 1 },
].map((r) => ({ __typename: 'StockReportRow', ...r }))

const BREACHES = [
  {
    workOrderId: 41,
    title: 'Troca de rolamento',
    assetId: 1,
    assetTag: 'TRN-001',
    assetName: 'Torno CNC #1',
    priority: 'CRITICAL',
    type: 'CORRECTIVE',
    createdAt: '2026-09-10T12:00:00.000Z',
    startedAt: '2026-09-10T17:00:00.000Z',
    completedAt: '2026-09-11T12:00:00.000Z',
    limitHours: 2,
    delayHours: 3,
  },
].map((b) => ({ __typename: 'SlaBreach', ...b }))

function mocks(
  overrides: { trend?: typeof TREND; status?: typeof STATUS; kpis?: typeof KPIS } = {},
  captured?: Captured,
): MockLink.MockedResponse[] {
  return [
    mock(GET_ASSETS, { assets: [] }),
    mock(GET_DASHBOARD_KPIS, { dashboardKpis: overrides.kpis ?? KPIS }, captured),
    mock(GET_DASHBOARD_SLA_RATE, {
      dashboardSlaRate: { __typename: 'SlaRate', withinSla: 4, total: 5, percentage: 80 },
    }),
    mock(GET_DASHBOARD_STATUS_COUNTS, { dashboardStatusCounts: overrides.status ?? STATUS }),
    mock(GET_DASHBOARD_MONTHLY_TREND, { dashboardMonthlyTrend: overrides.trend ?? TREND }),
    mock(GET_MONTHLY_COSTS, { monthlyCosts: COSTS }),
    mock(GET_STOCK_REPORT, { stockReport: STOCK }),
    mock(GET_SLA_BREACHES, { slaBreaches: BREACHES }),
  ]
}

/** Recharts não desenha no jsdom (sem layout); a tabela gêmea carrega os mesmos dados. */
async function chartTable(title: string): Promise<HTMLElement> {
  const card = await screen.findByRole('region', { name: title })
  return within(card).findByRole('table', { name: title })
}

describe('DashboardPage — gráficos', () => {
  it('deve exibir os cinco gráficos operacionais para quem não tem cost.read', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: mocks(), permissions: ['dashboard.read'] })

    // Assert
    for (const title of [
      'OS por status',
      'Abertas × concluídas por mês',
      'Corretiva × preventiva por mês',
      '% dentro do SLA por mês',
      'Ativos com maior MTTR',
    ]) {
      expect(await screen.findByRole('region', { name: title })).toBeInTheDocument()
    }
    expect(screen.queryByRole('region', { name: 'Custo realizado por mês' })).not.toBeInTheDocument()
  })

  it('deve exibir o custo mensal e a cobertura incompleta para quem tem cost.read', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, {
      mocks: mocks(),
      permissions: ['dashboard.read', 'cost.read'],
    })

    // Assert
    const table = await chartTable('Custo realizado por mês')
    expect(within(table).getByRole('row', { name: /setembro de 2026/ })).toHaveTextContent('R$ 420,00')
    expect(screen.getByText(/1 OS sem preço de peça ou taxa horária/)).toBeInTheDocument()
  })

  it('deve listar todos os status, em português, na tabela do gráfico de gargalo', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: mocks(), permissions: ['dashboard.read'] })

    // Assert
    const table = await chartTable('OS por status')
    expect(within(table).getAllByRole('row')).toHaveLength(8)
    expect(within(table).getByRole('row', { name: 'Em andamento 1' })).toBeInTheDocument()
  })

  it('deve mostrar abertas, concluídas e o % de SLA por mês', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: mocks(), permissions: ['dashboard.read'] })

    // Assert
    const flow = await chartTable('Abertas × concluídas por mês')
    expect(within(flow).getByRole('row', { name: 'setembro de 2026 4 2' })).toBeInTheDocument()
    const sla = await chartTable('% dentro do SLA por mês')
    expect(within(sla).getByRole('row', { name: 'outubro de 2026 100% 3 3' })).toBeInTheDocument()
  })

  it('deve ordenar os ativos do maior para o menor MTTR', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: mocks(), permissions: ['dashboard.read'] })

    // Assert
    const table = await chartTable('Ativos com maior MTTR')
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows.map((r) => r.textContent)).toEqual(['Compressor7,0 h', 'Torno CNC #14,5 h'])
  })

  it('deve avisar quando o período não tem OS', async () => {
    // Arrange
    const emptyTrend = TREND.map((p) => ({
      ...p,
      opened: 0,
      completed: 0,
      completedCorrective: 0,
      completedPreventive: 0,
      slaWithin: 0,
      slaTotal: 0,
      slaPercentage: null,
    }))

    // Act
    renderWithProviders(<DashboardPage />, {
      mocks: mocks({ trend: emptyTrend, status: STATUS.map((s) => ({ ...s, count: 0 })), kpis: [] }),
      permissions: ['dashboard.read'],
    })

    // Assert
    expect(await screen.findByText('Nenhuma OS aberta no período.')).toBeInTheDocument()
    expect(await screen.findByText('Nenhuma OS aberta ou concluída no período.')).toBeInTheDocument()
    expect(await screen.findByText('Nenhuma OS corretiva concluída no período.')).toBeInTheDocument()
  })

  it('deve consultar os últimos 6 meses por padrão', async () => {
    // Arrange
    const captured: Captured = []
    const expected = toPeriodFilter(defaultDateRange())

    // Act
    renderWithProviders(<DashboardPage />, {
      mocks: mocks({}, captured),
      permissions: ['dashboard.read'],
    })
    await chartTable('OS por status')

    // Assert
    expect(captured[0]?.from).toBe(expected.from)
    expect(captured[0]?.to?.slice(0, 10)).toBe(expected.to?.slice(0, 10))
  })

  it('deve levar os filtros da URL para o relatório pelo "Ver relatório"', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, {
      route: '/dashboard?assetId=3&from=2025-04-01&to=2025-06-30',
      path: '/dashboard',
      mocks: mocks(),
      permissions: ['dashboard.read'],
    })

    // Assert
    const sla = await screen.findByRole('region', { name: '% dentro do SLA por mês' })
    expect(within(sla).getByRole('link', { name: 'Ver relatório' })).toHaveAttribute(
      'href',
      '/dashboard/reports/sla?assetId=3&from=2025-04-01&to=2025-06-30',
    )
    const mttr = screen.getByRole('region', { name: 'Ativos com maior MTTR' })
    expect(within(mttr).getByRole('link', { name: 'Ver relatório' })).toHaveAttribute(
      'href',
      '/dashboard/reports/reliability?assetId=3&from=2025-04-01&to=2025-06-30',
    )
  })

  it('não deve mais exibir a tabela de KPIs por ativo (foi para Relatórios)', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: mocks(), permissions: ['dashboard.read'] })
    await chartTable('Ativos com maior MTTR')

    // Assert
    expect(screen.queryByRole('columnheader', { name: /MTBF/ })).not.toBeInTheDocument()
  })
})

describe('DashboardPage — quadro de turno', () => {
  const { from: currentFrom } = toPeriodFilter(defaultDateRange())

  /** KPIs diferentes para o período atual e o anterior. */
  function comparisonMocks(): MockLink.MockedResponse[] {
    const previousKpis = [{ ...KPIS[0], mttr: 8, mtbf: 600 }, { ...KPIS[1], mttr: 8 }]
    const byPeriod = (data: Record<string, unknown>, current: boolean): MockLink.MockedResponse => ({
      request: {
        query: GET_DASHBOARD_KPIS,
        variables: (vars: { filter?: DashboardFilterInput }) => (vars.filter?.from === currentFrom) === current,
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: { data },
    })
    return [
      byPeriod({ dashboardKpis: KPIS }, true),
      byPeriod({ dashboardKpis: previousKpis }, false),
      ...mocks().filter((m) => m.request.query !== GET_DASHBOARD_KPIS),
    ]
  }

  it('deve comparar o MTTR com o período anterior e indicar melhora', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: comparisonMocks(), permissions: ['dashboard.read'] })

    // Assert — MTTR atual (4,5 + 7) / 2 = 5,75 h; anterior 8 h: caiu 2,25 h
    const strip = await screen.findByRole('region', { name: 'Indicadores do período' })
    const delta = await within(strip).findByText('▼ 2,3 h')
    expect(delta).toHaveClass('text-success')
  })

  it('deve trocar o card de OEE por uma nota de cálculo pendente', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: mocks(), permissions: ['dashboard.read'] })

    // Assert
    expect(await screen.findByText(/OEE ainda não calculado/)).toBeInTheDocument()
    expect(screen.queryByText('Em breve')).toBeNull()
  })

  it('deve listar em Atenção as peças abaixo do mínimo e as OS iniciadas fora do SLA', async () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: mocks(), permissions: ['dashboard.read'] })

    // Assert
    const stock = await screen.findByRole('region', { name: 'Estoque abaixo do mínimo' })
    expect(await within(stock).findByRole('link', { name: /ROL-6205/ })).toHaveAttribute(
      'href',
      '/dashboard/spare-parts/1/edit',
    )
    expect(within(stock).queryByText('FLT-AR01')).toBeNull()

    const sla = screen.getByRole('region', { name: 'Iniciadas fora do SLA no período' })
    expect(await within(sla).findByRole('link', { name: /OS-0041/ })).toHaveAttribute('href', '/dashboard/work-orders/41')
    expect(within(sla).getByText('+3 h')).toBeInTheDocument()
  })

  it('deve orientar quem não tem dashboard.read para a lista de OS', () => {
    // Arrange / Act
    renderWithProviders(<DashboardPage />, { mocks: [], permissions: ['workorder.read'] })

    // Assert
    expect(screen.getByRole('link', { name: 'Ver ordens de serviço' })).toHaveAttribute('href', '/dashboard/work-orders')
    expect(screen.queryByRole('region', { name: 'Indicadores do período' })).toBeNull()
  })
})
