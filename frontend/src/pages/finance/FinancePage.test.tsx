import { screen } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import FinancePage from './FinancePage'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { GET_ASSET_COSTS } from '../../graphql/finance/GetAssetCosts.gql'
import type { AssetCost } from '../../graphql/finance/types'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Fixtures ───────────────────────────────────────────────
const makeCost = (overrides: Partial<AssetCost> = {}): AssetCost => ({
  assetId: 3,
  assetName: 'Injetora 03',
  assetTag: 'INJ-003',
  realizedPartsCost: 200,
  realizedLaborCost: 135,
  realizedExternalCost: 380,
  realizedTotal: 715,
  realizedCorrectiveCost: 715,
  realizedPreventiveCost: 0,
  forecastTotal: 130,
  completedWorkOrders: 4,
  workOrdersWithIncompleteCost: 0,
  ...overrides,
})

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

function costsMock(assetCosts: readonly AssetCost[]): MockLink.MockedResponse {
  return {
    request: { query: GET_ASSET_COSTS, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { assetCosts } },
  }
}

// ── Suite ──────────────────────────────────────────────────
describe('FinancePage', () => {
  it('deve renderizar o título e os filtros', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [assetsMock(), costsMock([makeCost()])],
      permissions: ['cost.read'],
    })

    // Assert
    expect(screen.getByRole('heading', { name: 'Custos por Ativo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Ativo')).toBeInTheDocument()
    expect(await screen.findByText('Período')).toBeInTheDocument()
  })

  it('deve exibir o custo realizado e o previsto como números distintos', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [assetsMock(), costsMock([makeCost()])],
      permissions: ['cost.read'],
    })

    // Assert
    expect(await screen.findByText('Custo realizado')).toBeInTheDocument()
    expect(screen.getByText('Custo previsto')).toBeInTheDocument()
    expect(screen.getAllByText('R$ 715,00').length).toBeGreaterThan(0)
    expect(screen.getAllByText('R$ 130,00').length).toBeGreaterThan(0)
  })

  it('deve exibir a quebra corretiva vs preventiva', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [
        assetsMock(),
        costsMock([
          makeCost({
            realizedCorrectiveCost: 600,
            realizedPreventiveCost: 115,
          }),
        ]),
      ],
      permissions: ['cost.read'],
    })

    // Assert — 600 de 715 ≈ 84%. "Corretiva" aparece no card e no cabeçalho
    // da tabela, por isso a busca é por todos.
    expect((await screen.findAllByText('Corretiva')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Preventiva').length).toBeGreaterThan(0)
    expect(screen.getByText('84% do realizado')).toBeInTheDocument()
    expect(screen.getByText('16% do realizado')).toBeInTheDocument()
  })

  it('deve declarar a cobertura quando há OS com custo incompleto', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [
        assetsMock(),
        costsMock([makeCost({ workOrdersWithIncompleteCost: 2, completedWorkOrders: 4 })]),
      ],
      permissions: ['cost.read'],
    })

    // Assert — espera o carregamento acabar: Spinner também usa role="status"
    await screen.findByText('Custo realizado')
    expect(screen.getByRole('status')).toHaveTextContent(
      /2\s*de\s*4 OS com custo incompleto/,
    )
  })

  it('não deve declarar cobertura quando tudo está completo', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [assetsMock(), costsMock([makeCost()])],
      permissions: ['cost.read'],
    })

    // Assert
    await screen.findByText('Custo realizado')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('deve listar uma linha por ativo com link para a tela do ativo', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [
        assetsMock(),
        costsMock([
          makeCost(),
          makeCost({ assetId: 1, assetName: 'Torno CNC #1', assetTag: 'TRN-001' }),
        ]),
      ],
      permissions: ['cost.read'],
    })

    // Assert
    expect(await screen.findByText('INJ-003')).toBeInTheDocument()
    expect(screen.getByText('TRN-001')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /INJ-003/ })).toHaveAttribute(
      'href',
      '/dashboard/assets/3',
    )
  })

  it('deve somar a linha de totais da tabela', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [
        assetsMock(),
        costsMock([
          makeCost({ realizedTotal: 100, realizedPartsCost: 100, realizedLaborCost: 0, realizedExternalCost: 0 }),
          makeCost({
            assetId: 1,
            assetTag: 'TRN-001',
            realizedTotal: 50,
            realizedPartsCost: 50,
            realizedLaborCost: 0,
            realizedExternalCost: 0,
          }),
        ]),
      ],
      permissions: ['cost.read'],
    })

    // Assert — 100 + 50
    await screen.findByText('INJ-003')
    expect(screen.getAllByText('R$ 150,00').length).toBeGreaterThan(0)
  })

  it('deve marcar na tabela os ativos com OS de custo incompleto', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [
        assetsMock(),
        costsMock([makeCost({ workOrdersWithIncompleteCost: 3, completedWorkOrders: 5 })]),
      ],
      permissions: ['cost.read'],
    })

    // Assert
    await screen.findByText('INJ-003')
    expect(screen.getByTitle('3 OS com custo incompleto')).toBeInTheDocument()
  })

  it('deve exibir estado vazio quando não há custo no período', async () => {
    // Arrange / Act
    renderWithProviders(<FinancePage />, {
      mocks: [assetsMock(), costsMock([])],
      permissions: ['cost.read'],
    })

    // Assert
    expect(
      await screen.findByText('Nenhum custo registrado no período selecionado.'),
    ).toBeInTheDocument()
  })

  it('deve pré-selecionar o ativo vindo da query string', async () => {
    // Arrange / Act — é como a tela do ativo encaminha para cá
    renderWithProviders(<FinancePage />, {
      route: '/dashboard/finance?assetId=3',
      path: '/dashboard/finance',
      mocks: [assetsMock(), costsMock([makeCost()])],
      permissions: ['cost.read'],
    })

    // Assert — espera a option existir: um <select> com value sem option
    // correspondente renderiza vazio.
    await screen.findByRole('option', { name: 'INJ-003 — Injetora 03' })
    expect(screen.getByLabelText('Ativo')).toHaveValue('3')
  })

  it('deve permitir limpar os filtros aplicados', async () => {
    // Arrange
    const { user } = renderWithProviders(<FinancePage />, {
      route: '/dashboard/finance?assetId=3',
      path: '/dashboard/finance',
      mocks: [assetsMock(), costsMock([makeCost()])],
      permissions: ['cost.read'],
    })
    await screen.findByRole('option', { name: 'INJ-003 — Injetora 03' })
    expect(screen.getByRole('button', { name: 'Limpar filtros' })).toBeInTheDocument()

    // Act
    await user.click(screen.getByRole('button', { name: 'Limpar filtros' }))

    // Assert
    expect(screen.getByLabelText('Ativo')).toHaveValue('')
    expect(screen.queryByRole('button', { name: 'Limpar filtros' })).not.toBeInTheDocument()
  })
})
