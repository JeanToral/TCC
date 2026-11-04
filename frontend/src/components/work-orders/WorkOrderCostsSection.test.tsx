import { screen, waitFor, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import WorkOrderCostsSection, { WorkOrderPartsSection } from './WorkOrderCostsSection'
import { ADD_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/AddWorkOrderExternalCost.gql'
import { REMOVE_WORK_ORDER_EXTERNAL_COST } from '../../graphql/work-order-costs/RemoveWorkOrderExternalCost.gql'
import { ADD_WORK_ORDER_PART, REMOVE_WORK_ORDER_PART } from '../../graphql/spare-parts/AddWorkOrderPart.gql'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
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

function sparePartsMock(): MockLink.MockedResponse {
  const part = (id: number, name: string, partNumber: string, quantity: number) => ({
    id, name, partNumber, quantity,
    description: null, minimumStock: 1, unitCost: 50, updatedAt: '2026-03-01T00:00:00.000Z',
  })
  return {
    request: { query: GET_SPARE_PARTS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        spareParts: [
          part(5, 'Rolamento 6205', 'ROL-6205', 10),
          part(6, 'Correia V A-42', 'COR-A42', 3),
          part(7, 'Retentor 40x62', 'RET-4062', 0),
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
    await screen.findByText('Frete da retificadora')
    expect(screen.getByRole('status')).toHaveTextContent('Custo incompleto')
  })

  it('não deve avisar quando a cobertura está completa', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage={false} />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read'] },
    )

    // Assert
    await screen.findByText('Frete da retificadora')
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
    expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
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

  it('deve pedir confirmação antes de remover um serviço externo', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const removeMock: MockLink.MockedResponse = {
      request: {
        query: REMOVE_WORK_ORDER_EXTERNAL_COST,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: { data: { removeWorkOrderExternalCost: true } },
    }
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [removeMock, workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )

    // Act
    await user.click(await screen.findByRole('button', { name: 'Remover Frete da retificadora' }))

    // Assert — nada enviado até confirmar
    const dialog = screen.getByRole('dialog', { name: 'Remover serviço externo' })
    expect(dialog).toHaveTextContent('Frete da retificadora')
    expect(sent).toHaveLength(0)

    // Act
    await user.click(within(dialog).getByRole('button', { name: 'Remover' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({ id: 1 })
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
    await user.type(screen.getByLabelText('Valor'), '0')
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
    await user.type(screen.getByLabelText('Valor'), '420000')
    await user.click(screen.getByRole('button', { name: 'Lançar' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        workOrderId: 10,
        description: 'Retífica do motor',
        supplier: 'Retificadora Oeste',
        amount: 4200,
        incurredAt: new Date(2026, 2, 10, 12, 0).toISOString(),
      },
    })
  })

  it('deve pré-preencher a data do serviço com a data de conclusão da OS', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )

    // Act
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))

    // Assert
    expect(screen.getByLabelText('Data do serviço')).toHaveTextContent('10/03/2026')
  })

  it('deve explicar que a data define o mês do custo', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )

    // Act
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))

    // Assert
    expect(screen.getByLabelText('Data do serviço')).toHaveAccessibleDescription(
      'Entra no custo do mês desta data, não no da conclusão da OS.',
    )
  })

  it('deve fechar só o calendário, não o modal, ao apertar Esc', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder()} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))
    await user.type(screen.getByLabelText('Descrição'), 'Retífica')
    await user.click(screen.getByLabelText('Data do serviço'))

    // Act
    await user.keyboard('{Escape}')

    // Assert
    expect(screen.getByRole('dialog')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Retífica')
  })

  it('não deve permitir escolher data do serviço no futuro', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderCostsSection workOrder={makeWorkOrder({ completedAt: null })} canManage />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['cost.read', 'cost.manage'] },
    )
    await user.click(await screen.findByRole('button', { name: 'Lançar serviço externo' }))

    // Act
    await user.click(screen.getByLabelText('Data do serviço'))

    // Assert — o calendário abre no mês atual; o dia seguinte a hoje está bloqueado
    const tomorrow = new Date()
    tomorrow.setDate(tomorrow.getDate() + 1)
    const tomorrowName = new RegExp(
      `\\b${tomorrow.getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(tomorrow)}`,
    )
    const todayName = new RegExp(
      `\\b${new Date().getDate()} de ${new Intl.DateTimeFormat('pt-BR', { month: 'long' }).format(new Date())}`,
    )
    expect(screen.getByRole('button', { name: todayName })).toBeEnabled()
    const tomorrowButtons = screen.queryAllByRole('button', { name: tomorrowName })
    tomorrowButtons.forEach((button) => expect(button).toBeDisabled())
  })
})

describe('WorkOrderPartsSection', () => {
  const inProgress = () => makeWorkOrder({ status: 'IN_PROGRESS', completedAt: null, closingNotes: null })

  it('deve listar as peças com o preço congelado e o subtotal com cost.read', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderPartsSection workOrder={makeWorkOrder()} canEdit={false} showCost />,
      { mocks: [partsMock(100), workOrderMock()], permissions: ['workorder.read', 'cost.read'] },
    )

    // Assert — 2 × R$ 100,00 = R$ 200,00
    expect(await screen.findByText('Rolamento 6205')).toBeInTheDocument()
    expect(screen.getByText('R$ 100,00')).toBeInTheDocument()
    expect(screen.getByText('R$ 200,00')).toBeInTheDocument()
  })

  it('deve exibir traço para peça sem preço congelado', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderPartsSection workOrder={makeWorkOrder()} canEdit={false} showCost />,
      { mocks: [partsMock(null), workOrderMock()], permissions: ['workorder.read', 'cost.read'] },
    )

    // Assert
    await screen.findByText('Rolamento 6205')
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
  })

  it('deve esconder as colunas de preço sem cost.read', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderPartsSection workOrder={makeWorkOrder()} canEdit={false} showCost={false} />,
      { mocks: [partsMock(null), workOrderMock()], permissions: ['workorder.read'] },
    )

    // Assert
    await screen.findByText('Rolamento 6205')
    expect(screen.queryByText('Preço congelado')).not.toBeInTheDocument()
    expect(screen.queryByText('Subtotal')).not.toBeInTheDocument()
  })

  it.each(['APPROVED', 'SCHEDULED', 'IN_PROGRESS'] as const)(
    'deve oferecer adicionar e remover peça em OS %s',
    async (status) => {
      // Arrange / Act
      renderWithProviders(
        <WorkOrderPartsSection workOrder={makeWorkOrder({ status })} canEdit showCost={false} />,
        { mocks: [partsMock(), workOrderMock()], permissions: ['workorder.update'] },
      )

      // Assert
      expect(await screen.findByRole('button', { name: 'Remover Rolamento 6205' })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Adicionar peça' })).toBeInTheDocument()
    },
  )

  it.each(['REQUESTED', 'COMPLETED', 'REJECTED', 'CANCELLED'] as const)(
    'não deve oferecer adicionar nem remover peça em OS %s',
    async (status) => {
      // Arrange / Act
      renderWithProviders(
        <WorkOrderPartsSection workOrder={makeWorkOrder({ status })} canEdit showCost={false} />,
        { mocks: [partsMock(), workOrderMock()], permissions: ['workorder.update'] },
      )

      // Assert
      await screen.findByText('Rolamento 6205')
      expect(screen.queryByRole('button', { name: 'Adicionar peça' })).not.toBeInTheDocument()
      expect(screen.queryByRole('button', { name: /Remover/ })).not.toBeInTheDocument()
    },
  )

  it('não deve oferecer ações sem workorder.update', async () => {
    // Arrange / Act
    renderWithProviders(
      <WorkOrderPartsSection workOrder={inProgress()} canEdit={false} showCost={false} />,
      { mocks: [partsMock(), workOrderMock()], permissions: ['workorder.read'] },
    )

    // Assert
    await screen.findByText('Rolamento 6205')
    expect(screen.queryByRole('button', { name: 'Adicionar peça' })).not.toBeInTheDocument()
  })

  it('deve listar no modal só as peças que ainda não estão na OS, com o estoque', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderPartsSection workOrder={inProgress()} canEdit showCost={false} />,
      { mocks: [partsMock(), sparePartsMock(), workOrderMock()], permissions: ['workorder.update'] },
    )

    // Act
    await user.click(await screen.findByRole('button', { name: 'Adicionar peça' }))

    // Assert
    expect(await screen.findByRole('option', { name: 'Correia V A-42 (COR-A42) — estoque: 3' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Retentor 40x62 (RET-4062) — estoque: 0' })).toBeDisabled()
    expect(screen.queryByRole('option', { name: /Rolamento 6205/ })).not.toBeInTheDocument()
  })

  it('deve rejeitar quantidade maior que o estoque', async () => {
    // Arrange
    const { user } = renderWithProviders(
      <WorkOrderPartsSection workOrder={inProgress()} canEdit showCost={false} />,
      { mocks: [partsMock(), sparePartsMock(), workOrderMock()], permissions: ['workorder.update'] },
    )
    await user.click(await screen.findByRole('button', { name: 'Adicionar peça' }))
    await screen.findByRole('option', { name: /Correia V A-42/ })

    // Act
    await user.selectOptions(screen.getByLabelText('Peça'), '6')
    await user.clear(screen.getByLabelText('Quantidade'))
    await user.type(screen.getByLabelText('Quantidade'), '4')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    // Assert
    expect(await screen.findByText('Quantidade maior que o estoque (3 un.).')).toBeInTheDocument()
  })

  it('deve enviar ADD_WORK_ORDER_PART com a peça e a quantidade escolhidas', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const addMock: MockLink.MockedResponse = {
      request: {
        query: ADD_WORK_ORDER_PART,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          addWorkOrderPart: {
            id: 2, workOrderId: 10, sparePartId: 6, quantityUsed: 2, createdAt: '2026-03-10T00:00:00.000Z',
            sparePart: { id: 6, name: 'Correia V A-42', partNumber: 'COR-A42' },
          },
        },
      },
    }
    const { user } = renderWithProviders(
      <WorkOrderPartsSection workOrder={inProgress()} canEdit showCost={false} />,
      { mocks: [partsMock(), sparePartsMock(), addMock, workOrderMock()], permissions: ['workorder.update'] },
    )
    await user.click(await screen.findByRole('button', { name: 'Adicionar peça' }))
    await screen.findByRole('option', { name: /Correia V A-42/ })

    // Act
    await user.selectOptions(screen.getByLabelText('Peça'), '6')
    await user.clear(screen.getByLabelText('Quantidade'))
    await user.type(screen.getByLabelText('Quantidade'), '2')
    await user.click(screen.getByRole('button', { name: 'Adicionar' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({ input: { workOrderId: 10, sparePartId: 6, quantityUsed: 2 } })
  })

  it('deve enviar REMOVE_WORK_ORDER_PART ao remover uma linha', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const removeMock: MockLink.MockedResponse = {
      request: {
        query: REMOVE_WORK_ORDER_PART,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: { data: { removeWorkOrderPart: true } },
    }
    const { user } = renderWithProviders(
      <WorkOrderPartsSection workOrder={inProgress()} canEdit showCost={false} />,
      { mocks: [partsMock(), removeMock, workOrderMock()], permissions: ['workorder.update'] },
    )

    // Act
    await user.click(await screen.findByRole('button', { name: 'Remover Rolamento 6205' }))
    const dialog = screen.getByRole('dialog', { name: 'Remover peça' })
    expect(dialog).toHaveTextContent('Remover Rolamento 6205 (2 un.) desta OS?')
    await user.click(within(dialog).getByRole('button', { name: 'Remover' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({ workOrderId: 10, sparePartId: 5 })
  })

  it('não deve remover a peça quando a confirmação é cancelada', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const removeMock: MockLink.MockedResponse = {
      request: {
        query: REMOVE_WORK_ORDER_PART,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: { data: { removeWorkOrderPart: true } },
    }
    const { user } = renderWithProviders(
      <WorkOrderPartsSection workOrder={inProgress()} canEdit showCost={false} />,
      { mocks: [partsMock(), removeMock, workOrderMock()], permissions: ['workorder.update'] },
    )

    // Act
    await user.click(await screen.findByRole('button', { name: 'Remover Rolamento 6205' }))
    await user.click(within(screen.getByRole('dialog')).getByRole('button', { name: 'Cancelar' }))

    // Assert
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument())
    expect(sent).toHaveLength(0)
  })
})
