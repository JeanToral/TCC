import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import SparePartsListPage from './SparePartsListPage'
import { GET_SPARE_PARTS } from '../../graphql/spare-parts/GetSpareParts.gql'
import type { SparePart } from '../../graphql/spare-parts/types'
import { renderWithProviders } from '../../test/renderWithProviders'

const makePart = (overrides: Partial<SparePart> = {}): SparePart => ({
  id: 1,
  name: 'Rolamento 6205',
  partNumber: 'ROL-6205',
  description: null,
  quantity: 2,
  minimumStock: 10,
  unitCost: 45.9,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
})

const PARTS = [makePart(), makePart({ id: 2, name: 'Filtro de ar', partNumber: 'FLT-AR01', quantity: 20, minimumStock: 6 })]

function partsMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_SPARE_PARTS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { spareParts: PARTS } },
  }
}

describe('SparePartsListPage', () => {
  it('deve marcar a peça abaixo do mínimo e contar no cabeçalho', async () => {
    // Arrange / Act
    renderWithProviders(<SparePartsListPage />, { permissions: ['sparepart.read'], mocks: [partsMock()] })

    // Assert
    const link = await screen.findByRole('link', { name: 'ROL-6205' })
    expect(link).toHaveAttribute('href', '/dashboard/spare-parts/1/edit')
    expect(screen.getByText('1 abaixo do mínimo')).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Abaixo do mínimo')).toBeInTheDocument()
    expect(within(rows[1]).queryByText('Abaixo do mínimo')).toBeNull()
  })

  it('não deve oferecer exclusão na lista', async () => {
    // Arrange / Act
    renderWithProviders(<SparePartsListPage />, { permissions: ['*'], mocks: [partsMock()] })
    await screen.findByRole('link', { name: 'ROL-6205' })

    // Assert
    expect(within(screen.getByRole('table')).queryByRole('button')).toBeNull()
  })

  it('deve filtrar apenas estoque baixo', async () => {
    // Arrange
    const { user } = renderWithProviders(<SparePartsListPage />, { permissions: ['sparepart.read'], mocks: [partsMock()] })
    await screen.findByRole('link', { name: 'FLT-AR01' })

    // Act
    await user.click(screen.getByLabelText('Apenas estoque baixo'))

    // Assert
    expect(screen.queryByRole('link', { name: 'FLT-AR01' })).toBeNull()
    expect(screen.getByRole('link', { name: 'ROL-6205' })).toBeInTheDocument()
  })

  it('deve oferecer o cadastro só para quem tem sparepart.create', async () => {
    // Arrange / Act
    renderWithProviders(<SparePartsListPage />, { permissions: ['sparepart.read'], mocks: [partsMock()] })
    await screen.findByRole('link', { name: 'ROL-6205' })

    // Assert
    expect(screen.queryByRole('button', { name: 'Cadastrar peça' })).toBeNull()
  })
})
