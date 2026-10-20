import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import AssetsListPage from './AssetsListPage'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import type { Asset } from '../../graphql/assets/types'
import { renderWithProviders } from '../../test/renderWithProviders'

const makeAsset = (overrides: Partial<Asset> = {}): Asset => ({
  id: 3,
  name: 'Injetora 03',
  tag: 'INJ-003',
  location: 'Galpão B',
  manufacturer: 'Romi',
  model: 'EN 150',
  serialNumber: null,
  installDate: '2024-02-01T00:00:00.000Z',
  createdAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

function assetsMock(assets: readonly Asset[]): MockLink.MockedResponse {
  return {
    request: { query: GET_ASSETS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { assets } },
  }
}

describe('AssetsListPage', () => {
  it('deve listar os ativos com a TAG como link para a ficha', async () => {
    // Arrange / Act
    renderWithProviders(<AssetsListPage />, {
      permissions: ['asset.read'],
      mocks: [assetsMock([makeAsset(), makeAsset({ id: 4, name: 'Torno CNC', tag: 'TRN-001', manufacturer: null })])],
    })

    // Assert
    expect(await screen.findByRole('link', { name: 'INJ-003' })).toHaveAttribute('href', '/dashboard/assets/3')
    const rows = within(screen.getByRole('table', { name: 'Ativos' })).getAllByRole('row').slice(1)
    expect(rows).toHaveLength(2)
    expect(within(rows[0]).queryByRole('button')).toBeNull()
  })

  it('deve filtrar por nome, TAG ou fabricante', async () => {
    // Arrange
    const { user } = renderWithProviders(<AssetsListPage />, {
      permissions: ['asset.read'],
      mocks: [assetsMock([makeAsset(), makeAsset({ id: 4, name: 'Torno CNC', tag: 'TRN-001', manufacturer: 'Ergomat' })])],
    })
    await screen.findByRole('link', { name: 'INJ-003' })

    // Act
    await user.type(screen.getByLabelText('Buscar ativos'), 'ergo')

    // Assert
    expect(screen.getByRole('link', { name: 'TRN-001' })).toBeInTheDocument()
    expect(screen.queryByRole('link', { name: 'INJ-003' })).toBeNull()
  })

  it('deve oferecer o cadastro só para quem tem asset.create', async () => {
    // Arrange / Act
    renderWithProviders(<AssetsListPage />, { permissions: ['asset.read'], mocks: [assetsMock([])] })

    // Assert
    expect(await screen.findByText('Nenhum ativo cadastrado.')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Cadastrar ativo' })).toBeNull()
    expect(screen.queryByRole('link', { name: 'Cadastrar ativo' })).toBeNull()
  })

  it('deve mostrar o próximo passo no estado vazio para quem pode cadastrar', async () => {
    // Arrange / Act
    renderWithProviders(<AssetsListPage />, { permissions: ['asset.create'], mocks: [assetsMock([])] })

    // Assert
    expect(await screen.findByRole('link', { name: 'Cadastrar ativo' })).toHaveAttribute('href', '/dashboard/assets/new')
  })
})
