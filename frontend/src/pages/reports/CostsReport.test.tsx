import { screen } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import CostsReport from './CostsReport'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { GET_ASSET_COSTS } from '../../graphql/finance/GetAssetCosts.gql'
import { GET_MONTHLY_COSTS } from '../../graphql/finance/GetMonthlyCosts.gql'
import type { AssetCost } from '../../graphql/finance/types'
import { renderWithProviders } from '../../test/renderWithProviders'

const FILTER = { from: '2026-05-01T03:00:00.000Z', to: '2026-10-11T02:59:59.999Z' }

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

function monthlyCostsMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_MONTHLY_COSTS, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { monthlyCosts: [] } },
  }
}

// ── Suite ──────────────────────────────────────────────────
describe('CostsReport', () => {
  it('deve exibir o custo realizado e o previsto como números distintos', async () => {
    // Arrange / Act
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [assetsMock(), monthlyCostsMock(), costsMock([makeCost()])],
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
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [
        assetsMock(),
        monthlyCostsMock(),
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
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [
        assetsMock(),
        monthlyCostsMock(),
        costsMock([makeCost({ workOrdersWithIncompleteCost: 2, completedWorkOrders: 4 })]),
      ],
      permissions: ['cost.read'],
    })

    // Assert
    await screen.findByText('Custo realizado')
    expect(screen.getByText(/OS com custo incompleto/)).toHaveTextContent(
      /2\s*de\s*4 OS com custo incompleto/,
    )
  })

  it('não deve declarar cobertura quando tudo está completo', async () => {
    // Arrange / Act
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [assetsMock(), monthlyCostsMock(), costsMock([makeCost()])],
      permissions: ['cost.read'],
    })

    // Assert
    await screen.findByText('Custo realizado')
    expect(screen.queryByText(/OS com custo incompleto/)).not.toBeInTheDocument()
  })

  it('deve listar uma linha por ativo com link para a tela do ativo', async () => {
    // Arrange / Act
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [
        assetsMock(),
        monthlyCostsMock(),
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
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [
        assetsMock(),
        monthlyCostsMock(),
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
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [
        assetsMock(),
        monthlyCostsMock(),
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
    renderWithProviders(<CostsReport filter={FILTER} />, {
      mocks: [assetsMock(), monthlyCostsMock(), costsMock([])],
      permissions: ['cost.read'],
    })

    // Assert
    expect(
      await screen.findByText('Nenhum custo registrado no período selecionado.'),
    ).toBeInTheDocument()
  })
})
