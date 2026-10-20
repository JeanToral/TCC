import { screen, waitFor, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import AssetViewPage from './AssetViewPage'
import { GET_ASSET } from '../../graphql/assets/GetAsset.gql'
import type { AssetDetail } from '../../graphql/assets/types'
import { GET_DASHBOARD_KPIS } from '../../graphql/dashboard/GetDashboardKpis.gql'
import { GET_ASSET_COSTS } from '../../graphql/finance/GetAssetCosts.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

const ASSET: AssetDetail = {
  id: 3,
  name: 'Injetora 03',
  tag: 'INJ-003',
  location: 'Galpão B',
  manufacturer: 'Romi',
  model: 'EN 150',
  serialNumber: 'SN-0042',
  installDate: '2024-02-01T12:00:00.000Z',
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-02T12:00:00.000Z',
  deletedAt: null,
}

const assetMock: MockLink.MockedResponse = {
  request: { query: GET_ASSET, variables: { id: 3 } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { asset: ASSET } },
}

const kpisMock: MockLink.MockedResponse = {
  request: { query: GET_DASHBOARD_KPIS, variables: { filter: { assetId: 3 } } },
  result: {
    data: {
      dashboardKpis: [
        { assetId: 3, assetName: 'Injetora 03', mtbf: 72, mttr: 4.5, totalWorkOrders: 9, completedWorkOrders: 6 },
      ],
    },
  },
}

function renderPage(permissions: readonly string[], mocks: readonly MockLink.MockedResponse[] = [assetMock]) {
  return renderWithProviders(<AssetViewPage />, {
    route: '/dashboard/assets/3',
    path: '/dashboard/assets/:id',
    permissions,
    mocks,
  })
}

describe('AssetViewPage', () => {
  it('deve abrir a ficha com a TAG e a plaqueta de identificação', async () => {
    // Arrange / Act
    renderPage(['asset.read'])

    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Injetora 03' })).toBeInTheDocument()
    const plate = screen.getByRole('figure', { name: 'Plaqueta de identificação' })
    expect(within(plate).getByText('INJ-003')).toBeInTheDocument()
    expect(within(plate).getByText('SN-0042')).toBeInTheDocument()
    expect(within(plate).getByText('Romi')).toBeInTheDocument()
  })

  it('deve exibir MTBF e MTTR para quem tem dashboard.read', async () => {
    // Arrange / Act
    renderPage(['asset.read', 'dashboard.read'], [assetMock, kpisMock])

    // Assert
    const indicators = await screen.findByRole('region', { name: 'Indicadores' })
    // 72 h viram 3 dias; abaixo de 48 h fica em horas
    expect(await within(indicators).findByText('3')).toBeInTheDocument()
    expect(within(indicators).getByText('d')).toBeInTheDocument()
    expect(within(indicators).getByText('4,5')).toBeInTheDocument()
    expect(within(indicators).getByText('de 9 OS registradas')).toBeInTheDocument()
  })

  it('não deve exibir indicadores nem custo sem as permissões', async () => {
    // Arrange / Act
    renderPage(['asset.read'])
    await screen.findByRole('heading', { level: 1, name: 'Injetora 03' })

    // Assert
    expect(screen.queryByRole('region', { name: 'Indicadores' })).toBeNull()
    expect(screen.queryByRole('region', { name: /Custo de manutenção/ })).toBeNull()
  })

  it('deve esconder Editar e desabilitar Remover sem permissão de escrita', async () => {
    // Arrange
    const { user } = renderPage(['asset.read'])
    await screen.findByRole('heading', { level: 1, name: 'Injetora 03' })

    // Act
    await user.click(screen.getByRole('button', { name: 'Mais ações' }))

    // Assert
    expect(screen.queryByRole('button', { name: 'Editar' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Remover ativo' })).toBeDisabled()
  })

  it('deve pedir confirmação antes de remover', async () => {
    // Arrange
    const { user } = renderPage(['asset.read', 'asset.update', 'asset.delete'])
    await screen.findByRole('heading', { level: 1, name: 'Injetora 03' })

    // Act
    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('button', { name: 'Remover ativo' }))

    // Assert
    const dialog = screen.getByRole('dialog', { name: 'Remover ativo' })
    expect(within(dialog).getByRole('button', { name: 'Confirmar remoção' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })

  it('deve mostrar estado de erro quando o ativo não existe', async () => {
    // Arrange / Act
    renderPage(['asset.read'], [{ request: { query: GET_ASSET, variables: { id: 3 } }, result: { data: { asset: null } } }])

    // Assert
    expect(await screen.findByText('Ativo não encontrado.')).toBeInTheDocument()
  })

  it('deve buscar o custo de 12 meses uma única vez (sem refazer a query a cada render)', async () => {
    // Arrange
    let requests = 0
    const costsMock: MockLink.MockedResponse = {
      request: {
        query: GET_ASSET_COSTS,
        variables: () => {
          requests += 1
          return true
        },
      },
      maxUsageCount: Number.POSITIVE_INFINITY,
      result: {
        data: {
          assetCosts: [
            {
              assetId: 3,
              assetName: 'Injetora 03',
              assetTag: 'INJ-003',
              realizedPartsCost: 100,
              realizedLaborCost: 50,
              realizedExternalCost: 0,
              realizedTotal: 150,
              realizedCorrectiveCost: 150,
              realizedPreventiveCost: 0,
              forecastTotal: 0,
              completedWorkOrders: 2,
              workOrdersWithIncompleteCost: 0,
            },
          ],
        },
      },
    }

    // Act
    renderPage(['asset.read', 'cost.read'], [assetMock, costsMock])
    await screen.findByText('Realizado')
    await new Promise((resolve) => setTimeout(resolve, 100))

    // Assert
    await waitFor(() => expect(requests).toBe(1))
  })
})
