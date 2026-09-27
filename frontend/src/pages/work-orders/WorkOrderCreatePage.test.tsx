import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import WorkOrderCreatePage from './WorkOrderCreatePage'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { CREATE_WORK_ORDER } from '../../graphql/work-orders/CreateWorkOrder.gql'
import { GET_WORK_ORDERS } from '../../graphql/work-orders/GetWorkOrders.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Helpers ───────────────────────────────────────────────
function assetsMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_ASSETS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        assets: [
          {
            id: 3,
            name: 'Injetora 03',
            tag: 'INJ-003',
            location: 'Galpão B',
            manufacturer: null,
            model: null,
            serialNumber: null,
            installDate: null,
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        ],
      },
    },
  }
}

function workOrdersMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_WORK_ORDERS, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        workOrders: {
          edges: [],
          pageInfo: { hasNextPage: false, endCursor: null },
        },
      },
    },
  }
}

describe('WorkOrderCreatePage', () => {
  it('deve renderizar todos os campos do formulário', async () => {
    // Arrange / Act
    renderWithProviders(<WorkOrderCreatePage />, {
      mocks: [assetsMock(), workOrdersMock()],
    })

    // Assert
    expect(
      await screen.findByRole('heading', { name: 'Nova Ordem de Serviço' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Tipo')).toBeInTheDocument()
    expect(screen.getByLabelText('Prioridade')).toBeInTheDocument()
    expect(screen.getByLabelText('Ativo')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Criar Ordem de Serviço' }),
    ).toBeInTheDocument()
  })

  it('deve oferecer os dois tipos e as quatro prioridades', async () => {
    // Arrange / Act
    renderWithProviders(<WorkOrderCreatePage />, {
      mocks: [assetsMock(), workOrdersMock()],
    })
    await screen.findByLabelText('Tipo')

    // Assert
    expect(screen.getByRole('option', { name: 'Corretiva' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Preventiva' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Baixa' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Média' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Alta' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Crítica' })).toBeInTheDocument()
  })

  it('deve exigir os cinco campos antes de submeter', async () => {
    // Arrange
    const { user } = renderWithProviders(<WorkOrderCreatePage />, {
      mocks: [assetsMock(), workOrdersMock()],
    })
    await screen.findByLabelText('Título')

    // Act
    await user.click(screen.getByRole('button', { name: 'Criar Ordem de Serviço' }))

    // Assert
    expect(await screen.findByText('Título é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Descrição é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Tipo é obrigatório')).toBeInTheDocument()
    expect(screen.getByText('Prioridade é obrigatória')).toBeInTheDocument()
    expect(screen.getByText('Ativo é obrigatório')).toBeInTheDocument()
  })

  it('deve listar o ativo com tag, nome e localização', async () => {
    // Arrange / Act
    renderWithProviders(<WorkOrderCreatePage />, {
      mocks: [assetsMock(), workOrdersMock()],
    })

    // Assert
    expect(
      await screen.findByRole('option', { name: 'INJ-003 — Injetora 03 (Galpão B)' }),
    ).toBeInTheDocument()
  })

  it('deve enviar assetId como número na mutation', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const createMock: MockLink.MockedResponse = {
      request: {
        query: CREATE_WORK_ORDER,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          createWorkOrder: {
            id: 42,
            title: 'Falha no rolamento',
            status: 'REQUESTED',
            priority: 'HIGH',
            type: 'CORRECTIVE',
            asset: { id: 3, name: 'Injetora 03', tag: 'INJ-003' },
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    }

    const { user } = renderWithProviders(<WorkOrderCreatePage />, {
      mocks: [assetsMock(), createMock, workOrdersMock()],
    })
    await screen.findByRole('option', { name: 'INJ-003 — Injetora 03 (Galpão B)' })

    // Act
    await user.type(screen.getByLabelText('Título'), 'Falha no rolamento')
    await user.type(screen.getByLabelText('Descrição'), 'Ruído anormal no motor principal')
    await user.selectOptions(screen.getByLabelText('Tipo'), 'CORRECTIVE')
    await user.selectOptions(screen.getByLabelText('Prioridade'), 'HIGH')
    await user.selectOptions(screen.getByLabelText('Ativo'), '3')
    await user.click(screen.getByRole('button', { name: 'Criar Ordem de Serviço' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        title: 'Falha no rolamento',
        description: 'Ruído anormal no motor principal',
        type: 'CORRECTIVE',
        priority: 'HIGH',
        assetId: 3,
      },
    })
  })
})
