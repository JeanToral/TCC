import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import PreventivePlanEditPage from './PreventivePlanEditPage'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { CREATE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/CreatePreventivePlan.gql'
import { GET_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/GetPreventivePlan.gql'
import { GET_PREVENTIVE_PLANS } from '../../graphql/preventive-plans/GetPreventivePlans.gql'
import { UPDATE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/UpdatePreventivePlan.gql'
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

function plansMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_PREVENTIVE_PLANS, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { preventivePlans: [] } },
  }
}

// Só o relógio é falso: o user-event continua usando timers reais.
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] })
  vi.setSystemTime(new Date(2026, 9, 10, 9, 0))
})
afterEach(() => {
  vi.useRealTimers()
})

describe('PreventivePlanEditPage — modo criação', () => {
  it('deve renderizar todos os campos do formulário', () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Novo plano preventivo' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Ativo')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Intervalo (dias)')).toBeInTheDocument()
    expect(screen.getByLabelText('Próxima Execução')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar plano' })).toBeInTheDocument()
  })

  it('deve iniciar o intervalo em 30 dias', () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(screen.getByLabelText('Intervalo (dias)')).toHaveValue(30)
  })

  it('não deve exibir o campo "Plano ativo" ao criar', () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(
      screen.queryByLabelText(/Plano ativo \(gera OS automaticamente quando vencido\)/),
    ).not.toBeInTheDocument()
  })

  it('deve carregar os ativos disponíveis no select', async () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(
      await screen.findByRole('option', { name: 'Injetora 03 (INJ-003)' }),
    ).toBeInTheDocument()
  })

  it('deve marcar nome, ativo e intervalo como obrigatórios via atributo HTML', () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(screen.getByLabelText('Nome')).toBeRequired()
    expect(screen.getByLabelText('Ativo')).toBeRequired()
    expect(screen.getByLabelText('Intervalo (dias)')).toBeRequired()
    expect(screen.getByLabelText('Descrição')).not.toBeRequired()
  })

  it('deve exigir a próxima execução antes de enviar', async () => {
    // Arrange
    const { user } = renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })
    await screen.findByRole('option', { name: 'Injetora 03 (INJ-003)' })

    // Act
    await user.type(screen.getByLabelText('Nome'), 'Troca de óleo mensal')
    await user.selectOptions(screen.getByLabelText('Ativo'), '3')
    await user.click(screen.getByRole('button', { name: 'Cadastrar plano' }))

    // Assert
    expect(await screen.findByText('Informe a próxima execução.')).toBeInTheDocument()
  })

  it('não deve permitir escolher dia passado na próxima execução', async () => {
    // Arrange
    const { user } = renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Act
    await user.click(screen.getByLabelText('Próxima Execução'))

    // Assert
    expect(screen.getByRole('button', { name: /\b9 de outubro de 2026/ })).toBeDisabled()
    expect(screen.getByRole('button', { name: /10 de outubro de 2026/ })).toBeEnabled()
  })

  it('deve enviar assetId e intervalDays como números e a data ao meio-dia local', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const createMock: MockLink.MockedResponse = {
      request: {
        query: CREATE_PREVENTIVE_PLAN,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          createPreventivePlan: {
            id: 1,
            name: 'Troca de óleo mensal',
            assetId: 3,
            intervalDays: 30,
            nextDueAt: '2026-10-15T00:00:00.000Z',
            isActive: true,
          },
        },
      },
    }

    const { user } = renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), createMock, plansMock()],
    })
    await screen.findByRole('option', { name: 'Injetora 03 (INJ-003)' })

    // Act
    await user.type(screen.getByLabelText('Nome'), 'Troca de óleo mensal')
    await user.selectOptions(screen.getByLabelText('Ativo'), '3')
    await user.click(screen.getByLabelText('Próxima Execução'))
    await user.click(screen.getByRole('button', { name: /15 de outubro de 2026/ }))
    await user.click(screen.getByRole('button', { name: 'Cadastrar plano' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        name: 'Troca de óleo mensal',
        description: undefined,
        assetId: 3,
        intervalDays: 30,
        nextDueAt: new Date(2026, 9, 15, 12, 0).toISOString(),
      },
    })
  })
})

function overduePlanMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_PREVENTIVE_PLAN, variables: { id: 9 } },
    result: {
      data: {
        preventivePlan: {
          id: 9,
          name: 'Lubrificação mensal',
          description: null,
          assetId: 3,
          asset: { id: 3, name: 'Injetora 03', tag: 'INJ-003' },
          intervalDays: 30,
          lastGeneratedAt: null,
          nextDueAt: '2026-09-01T15:00:00.000Z',
          isActive: true,
        },
      },
    },
  }
}

describe('PreventivePlanEditPage — modo edição', () => {
  it('não deve reenviar a próxima execução de plano atrasado quando ela não mudou', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const updateMock: MockLink.MockedResponse = {
      request: {
        query: UPDATE_PREVENTIVE_PLAN,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          updatePreventivePlan: {
            id: 9,
            name: 'Lubrificação das guias',
            assetId: 3,
            intervalDays: 30,
            nextDueAt: '2026-09-01T15:00:00.000Z',
            isActive: true,
          },
        },
      },
    }
    const { user } = renderWithProviders(<PreventivePlanEditPage />, {
      route: '/preventive-plans/9/edit',
      path: '/preventive-plans/:id/edit',
      mocks: [overduePlanMock(), assetsMock(), plansMock(), updateMock],
    })
    const name = await screen.findByDisplayValue('Lubrificação mensal')

    // Act
    await user.clear(name)
    await user.type(name, 'Lubrificação das guias')
    await user.click(screen.getByRole('button', { name: /Salvar/ }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      id: 9,
      input: expect.not.objectContaining({ nextDueAt: expect.anything() }),
    })
  })

  it('deve exibir a próxima execução pelo dia gravado', async () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      route: '/preventive-plans/9/edit',
      path: '/preventive-plans/:id/edit',
      mocks: [overduePlanMock(), assetsMock(), plansMock()],
    })

    // Assert
    expect(await screen.findByText('01/09/2026')).toBeInTheDocument()
  })

  it('deve preencher o formulário com o plano carregado', async () => {
    // Arrange
    const planMock: MockLink.MockedResponse = {
      request: { query: GET_PREVENTIVE_PLAN, variables: { id: 9 } },
      result: {
        data: {
          preventivePlan: {
            id: 9,
            name: 'Lubrificação mensal',
            description: 'Guias e fusos',
            assetId: 3,
            asset: { id: 3, name: 'Injetora 03', tag: 'INJ-003' },
            intervalDays: 30,
            lastGeneratedAt: null,
            nextDueAt: '2026-11-01T00:00:00.000Z',
            isActive: true,
          },
        },
      },
    }

    // Act
    renderWithProviders(<PreventivePlanEditPage />, {
      route: '/preventive-plans/9/edit',
      path: '/preventive-plans/:id/edit',
      mocks: [planMock, assetsMock(), plansMock()],
    })

    // Assert
    expect(await screen.findByDisplayValue('Lubrificação mensal')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toHaveValue('Guias e fusos')
    expect(screen.getByLabelText('Intervalo (dias)')).toHaveValue(30)
  })
})
