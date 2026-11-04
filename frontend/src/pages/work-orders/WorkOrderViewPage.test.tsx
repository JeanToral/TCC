import { screen, waitFor, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import WorkOrderViewPage from './WorkOrderViewPage'
import { APPROVE_WORK_ORDER } from '../../graphql/work-orders/ApproveWorkOrder.gql'
import { GET_WORK_ORDER } from '../../graphql/work-orders/GetWorkOrder.gql'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import type { WorkOrderDetail, WorkOrderStatus } from '../../graphql/work-orders/types'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Fixtures ───────────────────────────────────────────────
const makeWorkOrder = (overrides: Partial<WorkOrderDetail> = {}): WorkOrderDetail =>
  ({
    id: 41,
    title: 'Troca de rolamento',
    description: 'Ruído anormal no eixo',
    type: 'CORRECTIVE',
    priority: 'CRITICAL',
    status: 'REQUESTED',
    assetId: 3,
    asset: { id: 3, name: 'Injetora 03', tag: 'INJ-003', location: 'Galpão B' },
    requestedById: 1,
    requestedBy: { id: 1, name: 'Ana', email: 'ana@cmms.local' },
    assignedToId: null,
    assignedTo: null,
    scheduledStart: null,
    scheduledEnd: null,
    rejectionReason: null,
    closingNotes: null,
    cancellationReason: null,
    startedAt: null,
    completedAt: null,
    laborHours: null,
    costIsComplete: true,
    cost: null,
    externalCosts: null,
    createdAt: '2026-03-09T12:00:00.000Z',
    updatedAt: '2026-03-09T12:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }) as WorkOrderDetail

function workOrderMock(overrides: Partial<WorkOrderDetail> = {}): MockLink.MockedResponse {
  return {
    request: { query: GET_WORK_ORDER, variables: { id: 41 } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { workOrder: makeWorkOrder(overrides) } },
  }
}

function renderPage(permissions: readonly string[], mocks: readonly MockLink.MockedResponse[]) {
  return renderWithProviders(<WorkOrderViewPage />, {
    route: '/dashboard/work-orders/41',
    path: '/dashboard/work-orders/:id',
    permissions,
    mocks,
  })
}

async function renderWithStatus(status: WorkOrderStatus, permissions: readonly string[] = ['*']) {
  const result = renderPage(
    permissions.filter((p) => p !== 'cost.read'),
    [workOrderMock({ status })],
  )
  await screen.findByRole('heading', { level: 1, name: 'Troca de rolamento' })
  return result
}

// ── Suite ──────────────────────────────────────────────────
describe('WorkOrderViewPage', () => {
  it('deve abrir a ficha com o código da OS, o bloco de identificação e o ativo', async () => {
    // Arrange / Act
    await renderWithStatus('REQUESTED')

    // Assert
    expect(screen.getByText('OS-0041')).toBeInTheDocument()
    expect(screen.getByText('Crítica')).toBeInTheDocument()
    expect(screen.getByText('Solicitada')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /INJ-003/ })).toHaveAttribute('href', '/dashboard/assets/3')
  })

  it.each([
    ['REQUESTED', 'Aprovar'],
    ['APPROVED', 'Agendar'],
    ['SCHEDULED', 'Iniciar execução'],
    ['IN_PROGRESS', 'Concluir'],
  ] as const)('deve oferecer a ação da etapa atual para uma OS %s', async (status, action) => {
    // Arrange / Act
    await renderWithStatus(status)

    // Assert
    expect(screen.getByRole('button', { name: action })).toBeEnabled()
  })

  it('deve desabilitar Aprovar para quem não tem workorder.approve', async () => {
    // Arrange / Act
    await renderWithStatus('REQUESTED', ['workorder.read', 'workorder.update'])

    // Assert
    expect(screen.getByRole('button', { name: 'Aprovar' })).toBeDisabled()
    expect(screen.getByRole('button', { name: 'Rejeitar' })).toBeDisabled()
  })

  it('deve levar o cancelamento para o menu Mais ações', async () => {
    // Arrange
    const { user } = await renderWithStatus('SCHEDULED')
    expect(screen.queryByRole('button', { name: 'Cancelar OS' })).toBeNull()

    // Act
    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('button', { name: 'Cancelar OS' }))

    // Assert
    const dialog = screen.getByRole('dialog', { name: 'Cancelar ordem de serviço' })
    expect(within(dialog).getByLabelText('Motivo do cancelamento')).toBeRequired()
    expect(within(dialog).getByRole('button', { name: 'Confirmar cancelamento' })).toBeDisabled()
  })

  it('não deve oferecer ação nem cancelamento numa OS concluída', async () => {
    // Arrange / Act
    await renderWithStatus('COMPLETED')

    // Assert
    expect(screen.queryByRole('button', { name: 'Mais ações' })).toBeNull()
    expect(screen.queryByRole('button', { name: /Aprovar|Agendar|Iniciar|Concluir/ })).toBeNull()
  })

  it('deve carimbar a OS rejeitada com o motivo', async () => {
    // Arrange / Act
    renderPage(['workorder.read'], [workOrderMock({ status: 'REJECTED', rejectionReason: 'Duplicada' })])

    // Assert
    expect(await screen.findByText('Duplicada')).toBeInTheDocument()
    const flow = screen.getByRole('list', { name: 'Fluxo da ordem de serviço' }).parentElement as HTMLElement
    expect(within(flow).getByRole('status')).toHaveTextContent('Rejeitada')
  })

  it('deve aprovar a OS e fechar o modal', async () => {
    // Arrange
    const approved: MockLink.MockedResponse = {
      request: { query: APPROVE_WORK_ORDER, variables: { id: 41 } },
      result: { data: { approveWorkOrder: { id: 41, status: 'APPROVED', updatedAt: '2026-03-09T13:00:00.000Z' } } },
    }
    const list: MockLink.MockedResponse = {
      request: { query: GET_WORK_ORDERS },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: { data: { workOrders: { edges: [], pageInfo: { hasNextPage: false, endCursor: null } } } },
    }
    const { user } = renderPage(['workorder.approve'], [workOrderMock(), approved, list])
    await user.click(await screen.findByRole('button', { name: 'Aprovar' }))

    // Act
    await user.click(screen.getByRole('button', { name: 'Confirmar aprovação' }))

    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog', { name: 'Aprovar ordem de serviço' })).toBeNull())
    expect(screen.queryByRole('alert')).toBeNull()
  })

  it('deve mostrar estado de erro com volta para a lista quando a OS não existe', async () => {
    // Arrange / Act
    renderPage(['workorder.read'], [
      { request: { query: GET_WORK_ORDER, variables: { id: 41 } }, result: { data: { workOrder: null } } },
    ])

    // Assert
    expect(await screen.findByText('Ordem de serviço não encontrada.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar para Ordens de Serviço' })).toHaveAttribute(
      'href',
      '/dashboard/work-orders',
    )
  })

  it('deve listar como técnico responsável só usuários ativos com workorder.execute', async () => {
    // Arrange
    const user = (id: number, name: string, isActive: boolean, permissions: string[]) => ({
      id, name, email: `u${id}@cmms.local`, isActive, roleId: id, createdAt: '2026-01-01T00:00:00.000Z',
      role: { id, name: `Perfil ${id}`, permissions },
    })
    const usersMock: MockLink.MockedResponse = {
      request: { query: GET_USERS },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: {
        data: {
          users: [
            user(1, 'Técnico Ativo', true, ['workorder.read', 'workorder.execute']),
            user(2, 'Técnico Inativo', false, ['workorder.execute']),
            user(3, 'Gerente', true, ['workorder.approve']),
            user(4, 'Sysadmin', true, ['*']),
          ],
        },
      },
    }
    const { user: actor } = renderPage(['*'], [workOrderMock({ status: 'APPROVED' }), usersMock])
    await screen.findByRole('heading', { level: 1, name: 'Troca de rolamento' })

    // Act
    await actor.click(screen.getByRole('button', { name: 'Agendar' }))

    // Assert
    const select = await screen.findByLabelText('Técnico responsável')
    expect(await within(select).findByRole('option', { name: 'Técnico Ativo' })).toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: 'Técnico Inativo' })).not.toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: 'Gerente' })).not.toBeInTheDocument()
    expect(within(select).queryByRole('option', { name: 'Sysadmin' })).not.toBeInTheDocument()
  })
})
