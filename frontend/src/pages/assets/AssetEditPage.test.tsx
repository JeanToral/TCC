import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import AssetEditPage from './AssetEditPage'
import { CREATE_ASSET } from '../../graphql/assets/CreateAsset.gql'
import { GET_ASSETS } from '../../graphql/assets/GetAssets.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Helpers ───────────────────────────────────────────────
function assetsMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_ASSETS },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { assets: [] } },
  }
}

describe('AssetEditPage — modo criação', () => {
  it('deve renderizar todos os campos do formulário', () => {
    // Arrange / Act
    renderWithProviders(<AssetEditPage />, { mocks: [assetsMock()] })

    // Assert
    expect(screen.getByRole('heading', { name: 'Novo Ativo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('Tag')).toBeInTheDocument()
    expect(screen.getByLabelText('Localização')).toBeInTheDocument()
    expect(screen.getByLabelText('Fabricante')).toBeInTheDocument()
    expect(screen.getByLabelText('Modelo')).toBeInTheDocument()
    expect(screen.getByLabelText('Número de série')).toBeInTheDocument()
    expect(screen.getByText('Data de instalação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar ativo' })).toBeInTheDocument()
  })

  it('deve exigir nome e tag antes de submeter', async () => {
    // Arrange
    const { user } = renderWithProviders(<AssetEditPage />, { mocks: [assetsMock()] })

    // Act
    await user.click(screen.getByRole('button', { name: 'Criar ativo' }))

    // Assert
    expect(await screen.findByText('Nome é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('Tag é obrigatória.')).toBeInTheDocument()
  })

  it('deve limpar o erro do campo ao começar a digitar', async () => {
    // Arrange
    const { user } = renderWithProviders(<AssetEditPage />, { mocks: [assetsMock()] })
    await user.click(screen.getByRole('button', { name: 'Criar ativo' }))
    expect(await screen.findByText('Nome é obrigatório.')).toBeInTheDocument()

    // Act
    await user.type(screen.getByLabelText('Nome'), 'Torno CNC #3')

    // Assert
    expect(screen.queryByText('Nome é obrigatório.')).not.toBeInTheDocument()
  })

  it('deve enviar apenas os campos preenchidos na mutation', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const createMock: MockLink.MockedResponse = {
      request: {
        query: CREATE_ASSET,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          createAsset: {
            id: 1,
            name: 'Torno CNC #3',
            tag: 'TRN-003',
            location: null,
            manufacturer: null,
            model: null,
            serialNumber: null,
            installDate: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    }

    const { user } = renderWithProviders(<AssetEditPage />, {
      mocks: [createMock, assetsMock()],
    })

    // Act
    await user.type(screen.getByLabelText('Nome'), 'Torno CNC #3')
    await user.type(screen.getByLabelText('Tag'), 'TRN-003')
    await user.click(screen.getByRole('button', { name: 'Criar ativo' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        name: 'Torno CNC #3',
        tag: 'TRN-003',
        location: undefined,
        manufacturer: undefined,
        model: undefined,
        serialNumber: undefined,
        installDate: undefined,
      },
    })
  })
})
