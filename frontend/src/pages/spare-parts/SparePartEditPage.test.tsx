import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import SparePartEditPage from './SparePartEditPage'
import { CREATE_SPARE_PART } from '../../graphql/spare-parts/CreateSparePart.gql'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Helpers ───────────────────────────────────────────────
function sparePartsMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_SPARE_PARTS, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { spareParts: [] } },
  }
}

describe('SparePartEditPage — modo criação', () => {
  it('deve renderizar todos os campos do formulário', () => {
    // Arrange / Act
    renderWithProviders(<SparePartEditPage />, { mocks: [sparePartsMock()] })

    // Assert
    expect(
      screen.getByRole('heading', { name: 'Nova Peça de Reposição' }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Nome *')).toBeInTheDocument()
    expect(screen.getByLabelText('Código (Part Number) *')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição')).toBeInTheDocument()
    expect(screen.getByLabelText('Quantidade em Estoque')).toBeInTheDocument()
    expect(screen.getByLabelText('Estoque Mínimo')).toBeInTheDocument()
    expect(screen.getByLabelText('Custo Unitário (R$)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar Peça' })).toBeInTheDocument()
  })

  it('deve iniciar quantidade e estoque mínimo em zero e custo vazio', () => {
    // Arrange / Act
    renderWithProviders(<SparePartEditPage />, { mocks: [sparePartsMock()] })

    // Assert
    expect(screen.getByLabelText('Quantidade em Estoque')).toHaveValue(0)
    expect(screen.getByLabelText('Estoque Mínimo')).toHaveValue(0)
    expect(screen.getByLabelText('Custo Unitário (R$)')).toHaveValue(null)
  })

  // Documenta o estado atual: a obrigatoriedade é só o atributo HTML `required`,
  // não há validação em JavaScript como nas telas de Ativo e Usuário.
  it('deve marcar nome e código como obrigatórios via atributo HTML', () => {
    // Arrange / Act
    renderWithProviders(<SparePartEditPage />, { mocks: [sparePartsMock()] })

    // Assert
    expect(screen.getByLabelText('Nome *')).toBeRequired()
    expect(screen.getByLabelText('Código (Part Number) *')).toBeRequired()
    expect(screen.getByLabelText('Quantidade em Estoque')).not.toBeRequired()
  })

  it('deve permitir editar o código apenas na criação', () => {
    // Arrange / Act
    renderWithProviders(<SparePartEditPage />, { mocks: [sparePartsMock()] })

    // Assert
    expect(screen.getByLabelText('Código (Part Number) *')).toBeEnabled()
  })

  it('deve enviar unitCost indefinido quando o custo não é informado', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const createMock: MockLink.MockedResponse = {
      request: {
        query: CREATE_SPARE_PART,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          createSparePart: {
            id: 1,
            name: 'Rolamento 6205',
            partNumber: 'ROL-6205',
            description: null,
            quantity: 12,
            minimumStock: 4,
            unitCost: null,
          },
        },
      },
    }

    const { user } = renderWithProviders(<SparePartEditPage />, {
      mocks: [createMock, sparePartsMock()],
    })

    // Act
    await user.type(screen.getByLabelText('Nome *'), 'Rolamento 6205')
    await user.type(screen.getByLabelText('Código (Part Number) *'), 'ROL-6205')
    await user.clear(screen.getByLabelText('Quantidade em Estoque'))
    await user.type(screen.getByLabelText('Quantidade em Estoque'), '12')
    await user.clear(screen.getByLabelText('Estoque Mínimo'))
    await user.type(screen.getByLabelText('Estoque Mínimo'), '4')
    await user.click(screen.getByRole('button', { name: 'Criar Peça' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        name: 'Rolamento 6205',
        partNumber: 'ROL-6205',
        description: undefined,
        quantity: 12,
        minimumStock: 4,
        unitCost: undefined,
      },
    })
  })

  it('deve enviar unitCost como número quando informado', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const createMock: MockLink.MockedResponse = {
      request: {
        query: CREATE_SPARE_PART,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          createSparePart: {
            id: 2,
            name: 'Correia A-52',
            partNumber: 'COR-A52',
            description: null,
            quantity: 0,
            minimumStock: 0,
            unitCost: 35.9,
          },
        },
      },
    }

    const { user } = renderWithProviders(<SparePartEditPage />, {
      mocks: [createMock, sparePartsMock()],
    })

    // Act
    await user.type(screen.getByLabelText('Nome *'), 'Correia A-52')
    await user.type(screen.getByLabelText('Código (Part Number) *'), 'COR-A52')
    await user.type(screen.getByLabelText('Custo Unitário (R$)'), '35.90')
    await user.click(screen.getByRole('button', { name: 'Criar Peça' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect((sent[0].input as { unitCost: number }).unitCost).toBe(35.9)
  })
})
