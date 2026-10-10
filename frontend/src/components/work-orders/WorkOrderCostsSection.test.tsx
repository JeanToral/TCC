import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import WorkOrderCostsSection from './WorkOrderCostsSection'
import { ADD_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/AddWorkOrderExternalCost.gql'
import { GET_WORK_ORDER_PARTS } from '../../graphql/work-order-costs/GetWorkOrderParts.gql'
import { GET_WORK_ORDER } from '../../graphql/work-orders/GetWorkOrder.gql'
import type { WorkOrderDetail } from '../../graphql/work-orders/types'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Fixtures ───────────────────────────────────────────────
const makeWorkOrder = (overrides: Partial<WorkOrderDetail> = {}): WorkOrderDetail =>
  ({
    id: 10,
    title: 'Falha no rolamento',
    description: 'Ruído anormal',
    type: 'CORRECTIVE',
    priority: 'HIGH',
    status: 'COMPLETED',
    assetId: 3,
    asset: { id: 3, name: 'Injetora 03', tag: 'INJ-003', location: 'Galpão B' },
    requestedById: 1,
    requestedBy: { id: 1, name: 'Ana', email: 'ana@cmms.local' },
    assignedToId: 2,
    assignedTo: { id: 2, name: 'João', email: 'joao@cmms.local' },
    scheduledStart: null,
    scheduledEnd: null,
    rejectionReason: null,
    closingNotes: 'Trocado',
    cancellationReason: null,
    startedAt: '2026-03-10T16:00:00.000Z',
    completedAt: '2026-03-10T19:00:00.000Z',
    laborHours: 3,
    costIsComplete: true,
    cost: {
      partsCost: 200,
      laborCost: 135,
      externalCost: 380,
      total: 715,
      isComplete: true,
    },
    externalCosts: [
      {
        id: 1,
        workOrderId: 10,
        description: 'Frete da retificadora',
        supplier: 'Transportes Oeste',
        amount: 380,
        incurredAt: '2026-03-10T00:00:00.000Z',
        createdById: 2,
        createdAt: '2026-03-25T00:00:00.000Z',
        updatedAt: '2026-03-25T00:00:00.000Z',
      },
    ],
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-10T19:00:00.000Z',
    deletedAt: null,
    ...overrides,
  }) as WorkOrderDetail

function partsMock(unitCostSnapshot: number | null = 100): MockLink.MockedResponse {
  return {
    request: { query: GET_WORK_ORDER_PARTS, variables: { workOrderId: 10 } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        workOrderParts: [
          {
            id: 1,
            sparePartId: 5,
            quantityUsed: 2,
            unitCostSnapshot,
            sparePart: { id: 5, name: 'Rolamento 6205', partNumber: 'ROL-6205' },
          },
        ],
      },
    },
  }
}

function workOrderMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_WORK_ORDER, variables: { id: 10 } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { workOrder: makeWorkOrder() } },
  }
}

// ── Suite ──────────────────────────────────────────────────
describe('WorkOrderCostsSection', () => {
  it('deve exibir a decomposição de custo em reais', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage={false} />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert
    expect(await screen.findByText('R$ 715,00')).toBeInTheDocument()
    // R$ 380,00 aparece duas vezes: na linha do lançamento e no total da categoria
    expect(screen.getAllByText('R$ 380,00')).toHaveLength(2)
  })

  it('deve listar as peças com o preço congelado e o subtotal', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage={false} />,
      { mocks: [partsMock(100), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert — 2 × R$ 100,00 = R$ 200,00
    expect(await screen.findByText('Rolamento 6205')).toBeInTheDocument()
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument()
  })

  it('deve exibir traço para peça sem preço congelado', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage={false} />,
      { mocks: [partsMock(null), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert
    await screen.findByText('Rolamento 6205')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('deve exibir as horas apontadas separadas do custo de mão de obra', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage={false} />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert
    expect(await screen.findByText('3 h')).toBeInTheDocument()
    expect(screen.getAllByText('R$ 135,00').length).toBeGreaterThan(0)
  })

  it('deve avisar quando a cobertura de custo está incompleta', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection
        workOrder={makeWorkOrder({ costIsComplete: false })}
        canManage={false}
      />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert
    expect(await screen.findByRole('status')).toHaveTextContent('Custo incompleto')
  })

  it('não deve avisar quando a cobertura está completa', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage={false} />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert
    await screen.findByText('Rolamento 6205')
    expect(screen.queryByText(/Custo incompleto/)).not.toBeInTheDocument()
  })

  it('deve esconder as ações de lançamento sem cost.manage', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage={false} />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert
    await screen.findByText('Frete da retificadora')
    expect(
      screen.queryByRole('button', { name: 'Lançar serviço externo' }),
    ).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Editar' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Remover' })).not.toBeInTheDocument()
  })

  it('deve oferecer as ações de lançamento com cost.manage', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )

    // Assert
    expect(
      await screen.findByRole('button', { name: 'Lançar serviço externo' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('deve exigir descrição, valor e competência no lançamento', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))

    // Act — descrição vazia
    await user.click(screen.getByRole('button', { name: 'Lançar' }))

    // Assert
    expect(await screen.findByText('Descrição é obrigatória.')).toBeInTheDocument()
  })

  it('deve rejeitar valor menor ou igual a zero', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))

    // Act
    await user.type(screen.getByLabelText('Descrição'), 'Retífica')
    await user.type(screen.getByLabelText('Valor (R$)'), '0')
    await user.click(screen.getByRole('button', { name: 'Lançar' }))

    // Assert
    expect(await screen.findByText('O valor deve ser maior que zero.')).toBeInTheDocument()
  })

  it('deve enviar o lançamento com a competência informada', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const addMock: MockLink.MockedResponse = {
      request: {
        query: ADD_WORK_ORDER_EXTERNAL_COST,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          addWorkOrderExternalCost: {
            id: 2,
            workOrderId: 10,
            description: 'Retífica do motor',
            supplier: 'Retificadora Oeste',
            amount: 4200,
            incurredAt: '2026-03-10T00:00:00.000Z',
            createdById: 2,
            createdAt: '2026-03-25T00:00:00.000Z',
            updatedAt: '2026-03-25T00:00:00.000Z',
          },
        },
      },
    }

    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      {
        mocks: [partsMock(), addMock, workOrderMock()],
        permissions: ['cost.read', 'cost.manage'],
      },
    )
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))

    // Act
    await user.type(screen.getByLabelText('Descrição'), 'Retífica do motor')
    await user.type(screen.getByLabelText('Fornecedor (opcional)'), 'Retificadora Oeste')
    await user.type(screen.getByLabelText('Valor (R$)'), '4200')
    await user.click(screen.getByRole('button', { name: 'Lançar' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        workOrderId: 10,
        description: 'Retífica do motor',
        supplier: 'Retificadora Oeste',
        amount: 4200,
        incurredAt: '2026-03-10T00:00:00.000Z',
      },
    })
  })

  it('deve pré-preencher a competência com a data de conclusão da OS', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )

    // Act
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))

    // Assert
    expect(screen.getByLabelText('Competência')).toHaveValue('2026-03-10')
  })
})
