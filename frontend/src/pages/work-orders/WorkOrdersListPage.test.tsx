import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import WorkOrdersListPage from './WorkOrdersListPage'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import type { WorkOrderListItem } from '../../graphql/work-orders/types'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Fixtures ───────────────────────────────────────────────
const makeItem = (overrides: Partial<WorkOrderListItem> = {}): WorkOrderListItem =>
  ({
    id: 41,
    title: 'Troca de rolamento',
    type: 'CORRECTIVE',
    priority: 'CRITICAL',
    status: 'IN_PROGRESS',
    assetId: 3,
    asset: { id: 3, name: 'Injetora 03', tag: 'INJ-003', location: 'Galpão B' },
    requestedById: 1,
    requestedBy: { id: 1, name: 'Ana', email: 'ana@cmms.local' },
    assignedToId: null,
    assignedTo: null,
    scheduledStart: null,
    createdAt: '2026-03-09T12:00:00.000Z',
    ...overrides,
  }) as WorkOrderListItem

function listMock(
  items: readonly WorkOrderListItem[],
  variables: Record<string, unknown> = {},
): MockLink.MockedResponse {
  return {
    request: { query: GET_WORK_ORDERS, variables: { first: 20, ...variables } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        workOrders: {
          edges: items.map((node) => ({ cursor: `c${node.id}`, node })),
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    },
  }
}

// ── Suite ──────────────────────────────────────────────────
describe('WorkOrdersListPage', () => {
  it('deve listar as OS com o código em destaque e o link para a ficha', async () => {
    // Arrange / Act
    renderWithProviders(<WorkOrdersListPage />, {
      permissions: ['workorder.read'],
      mocks: [listMock([makeItem(), makeItem({ id: 7, title: 'Lubrificação', priority: 'LOW', status: 'COMPLETED' })])],
    })

    // Assert
    await screen.findByRole('link', { name: 'OS-0041' })
    const table = screen.getByRole('table', { name: 'Ordens de serviço' })
    const rows = within(table).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).getByRole('link', { name: 'OS-0041' })).toHaveAttribute('href', '/dashboard/work-orders/41')
    expect(within(rows[0]).getByText('Crítica')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Concluída')).toBeInTheDocument()
  })

  it('não deve ter coluna de ações por linha', async () => {
    // Arrange / Act
    renderWithProviders(<WorkOrdersListPage />, { permissions: ['*'], mocks: [listMock([makeItem()])] })

    // Assert
    await screen.findByRole('link', { name: 'OS-0041' })
    expect(within(screen.getByRole('table')).queryByRole('button')).toBeNull()
  })

  it('deve esconder Abrir OS de quem não tem workorder.create', async () => {
    // Arrange / Act
    renderWithProviders(<WorkOrdersListPage />, { permissions: ['workorder.read'], mocks: [listMock([])] })

    // Assert
    expect(await screen.findByText('Nenhuma ordem de serviço aberta.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Abrir OS' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Abrir OS' })).toBeNull()
  })

  it('deve oferecer Abrir OS no estado vazio para quem pode criar', async () => {
    // Arrange / Act
    renderWithProviders(<WorkOrdersListPage />, { permissions: ['workorder.create'], mocks: [listMock([])] })

    // Assert
    expect(await screen.findByRole('link', { name: 'Abrir OS' })).toHaveAttribute('href', '/dashboard/work-orders/new')
  })

  it('deve refazer a busca ao filtrar por situação', async () => {
    // Arrange
    const { user } = renderWithProviders(<WorkOrdersListPage />, {
      permissions: ['workorder.read'],
      mocks: [
        listMock([makeItem()]),
        listMock([makeItem({ id: 7, title: 'Lubrificação', status: 'COMPLETED' })], { filter: { status: 'COMPLETED' } }),
      ],
    })
    await screen.findByText('Troca de rolamento')

    // Act
    await user.selectOptions(screen.getByLabelText('Filtrar por situação'), 'COMPLETED')

    // Assert
    expect(await screen.findByText('Lubrificação')).toBeInTheDocument()
    expect(screen.queryByText('Troca de rolamento')).toBeNull()
  })
})
