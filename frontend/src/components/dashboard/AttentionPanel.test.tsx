import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import AttentionPanel from './AttentionPanel'
import { GET_SLA_BREACHES } from '../../graphql/dashboard/GetSlaBreaches.gql'
import { GET_STOCK_REPORT } from '../../graphql/dashboard/GetStockReport.gql'
import type { SlaBreach, StockReportRow } from '../../graphql/dashboard/types'
import { renderWithProviders } from '../../test/renderWithProviders'

const FILTER = { from: '2026-05-01T03:00:00.000Z', to: '2026-10-21T02:59:59.999Z' }

const stockRow = (overrides: Partial<StockReportRow>): StockReportRow => ({
  sparePartId: 1,
  partNumber: 'ROL-6205',
  name: 'Rolamento',
  quantity: 2,
  minimumStock: 10,
  belowMinimum: true,
  consumed: 0,
  workOrders: 0,
  ...overrides,
})

const breach = (overrides: Partial<SlaBreach>): SlaBreach => ({
  workOrderId: 41,
  title: 'Troca de rolamento',
  assetId: 1,
  assetTag: 'TRN-001',
  assetName: 'Torno',
  priority: 'CRITICAL',
  type: 'CORRECTIVE',
  createdAt: '2026-09-10T12:00:00.000Z',
  startedAt: '2026-09-10T17:00:00.000Z',
  completedAt: '2026-09-11T12:00:00.000Z',
  limitHours: 2,
  delayHours: 3,
  ...overrides,
})

function render(stock: readonly StockReportRow[], breaches: readonly SlaBreach[]) {
  const mocks: MockLink.MockedResponse[] = [
    { request: { query: GET_STOCK_REPORT, variables: { filter: FILTER } }, result: { data: { stockReport: stock } } },
    { request: { query: GET_SLA_BREACHES, variables: { filter: FILTER } }, result: { data: { slaBreaches: breaches } } },
  ]
  renderWithProviders(<AttentionPanel filter={FILTER} search="?assetId=1" />, { mocks })
}

describe('AttentionPanel', () => {
  it('deve listar só as peças abaixo do mínimo, da maior falta para a menor', async () => {
    // Arrange / Act
    render(
      [
        stockRow({ sparePartId: 1, partNumber: 'ROL-6205', quantity: 8, minimumStock: 10 }),
        stockRow({ sparePartId: 2, partNumber: 'FLT-AR01', quantity: 20, minimumStock: 6, belowMinimum: false }),
        stockRow({ sparePartId: 3, partNumber: 'RET-4062', quantity: 0, minimumStock: 6 }),
      ],
      [],
    )

    // Assert
    const list = await screen.findByRole('region', { name: 'Estoque abaixo do mínimo' })
    const links = await within(list).findAllByRole('link')
    expect(links.map((l) => l.getAttribute('href'))).toEqual([
      '/dashboard/spare-parts/3/edit',
      '/dashboard/spare-parts/1/edit',
    ])
  })

  it('deve ordenar as OS pelo maior atraso e levar à ficha', async () => {
    // Arrange / Act
    render([], [breach({ workOrderId: 41, delayHours: 3 }), breach({ workOrderId: 7, title: 'Vazamento', delayHours: 30 })])

    // Assert
    const list = await screen.findByRole('region', { name: 'Iniciadas fora do SLA no período' })
    const links = await within(list).findAllByRole('link')
    expect(links[0]).toHaveTextContent('OS-0007')
    expect(links[0]).toHaveTextContent('+30 h')
    expect(links[1]).toHaveAttribute('href', '/dashboard/work-orders/41')
  })

  it('deve mostrar no máximo 5 itens e oferecer o relatório completo com os filtros', async () => {
    // Arrange / Act
    const many = Array.from({ length: 7 }, (_, i) => breach({ workOrderId: i + 1, delayHours: i + 1 }))
    render([], many)

    // Assert
    const list = await screen.findByRole('region', { name: 'Iniciadas fora do SLA no período' })
    expect((await within(list).findAllByRole('link', { name: /OS-/ })).length).toBe(5)
    expect(within(list).getByRole('link', { name: 'Ver todas' })).toHaveAttribute('href', '/dashboard/reports/sla?assetId=1')
    expect(within(list).getByText('7')).toBeInTheDocument()
  })

  it('deve informar quando não há nada pedindo atenção', async () => {
    // Arrange / Act
    render([], [])

    // Assert
    expect(await screen.findByText('Nenhuma peça abaixo do mínimo.')).toBeInTheDocument()
    expect(await screen.findByText('Nenhuma OS do período começou fora do prazo.')).toBeInTheDocument()
  })
})
