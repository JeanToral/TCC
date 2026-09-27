import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import PreventivePlanEditPage from './PreventivePlanEditPage'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { CREATE_PREVENTIVE_PLAN } from '../../graphql/preventive-plans/CreatePreventivePlan.gql'
import { GET_PREVENTIVE_PLANS } from '../../graphql/preventive-plans/GetPreventivePlans.gql'
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

describe('PreventivePlanEditPage — modo criação', () => {
  it('deve renderizar todos os campos do formulário', () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Novo Plano Preventivo' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nome *')).toBeInTheDocument()
    expect(screen.getByLabelText('Ativo *')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Intervalo (dias) *')).toBeInTheDocument()
    expect(screen.getByLabelText('Próxima Execução *')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar Plano' })).toBeInTheDocument()
  })

  it('deve iniciar o intervalo em 30 dias', () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(screen.getByLabelText('Intervalo (dias) *')).toHaveValue(30)
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

  // Documenta o estado atual: obrigatoriedade apenas pelo atributo HTML,
  // sem validação em JavaScript.
  it('deve marcar nome, ativo, intervalo e data como obrigatórios via atributo HTML', () => {
    // Arrange / Act
    renderWithProviders(<PreventivePlanEditPage />, {
      mocks: [assetsMock(), plansMock()],
    })

    // Assert
    expect(screen.getByLabelText('Nome *')).toBeRequired()
    expect(screen.getByLabelText('Ativo *')).toBeRequired()
    expect(screen.getByLabelText('Intervalo (dias) *')).toBeRequired()
    expect(screen.getByLabelText('Próxima Execução *')).toBeRequired()
    expect(screen.getByLabelText('Descrição')).not.toBeRequired()
  })

  it('deve enviar assetId e intervalDays como números e a data em ISO', async () => {
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
    await user.type(screen.getByLabelText('Nome *'), 'Troca de óleo mensal')
    await user.selectOptions(screen.getByLabelText('Ativo *'), '3')
    await user.type(screen.getByLabelText('Próxima Execução *'), '2026-10-15')
    await user.click(screen.getByRole('button', { name: 'Criar Plano' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        name: 'Troca de óleo mensal',
        description: undefined,
        assetId: 3,
        intervalDays: 30,
        nextDueAt: '2026-10-15T00:00:00.000Z',
      },
    })
  })
})
