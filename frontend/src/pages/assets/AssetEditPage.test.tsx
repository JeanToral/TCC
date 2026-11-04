import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import AssetEditPage from './AssetEditPage'
import { CREATE_ASSET } from '../../graphql/assets/CreateAsset.gql'
import { GET_ASSET } from '../../graphql/assets/GetAsset.gql'
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
    expect(screen.getByRole('heading', { name: 'Novo ativo' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome')).toBeInTheDocument()
    expect(screen.getByLabelText('TAG')).toBeInTheDocument()
    expect(screen.getByLabelText('Localização')).toBeInTheDocument()
    expect(screen.getByLabelText('Fabricante')).toBeInTheDocument()
    expect(screen.getByLabelText('Modelo')).toBeInTheDocument()
    expect(screen.getByLabelText('Número de série')).toBeInTheDocument()
    expect(screen.getByText('Data de instalação')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cadastrar ativo' })).toBeInTheDocument()
  })

  it('deve exigir nome e tag antes de submeter', async () => {
    // Arrange
    const { user } = renderWithProviders(<AssetEditPage />, { mocks: [assetsMock()] })

    // Act
    await user.click(screen.getByRole('button', { name: 'Cadastrar ativo' }))

    // Assert
    expect(await screen.findByText('Nome é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('TAG é obrigatória.')).toBeInTheDocument()
  })

  it('deve limpar o erro do campo ao começar a digitar', async () => {
    // Arrange
    const { user } = renderWithProviders(<AssetEditPage />, { mocks: [assetsMock()] })
    await user.click(screen.getByRole('button', { name: 'Cadastrar ativo' }))
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
    await user.type(screen.getByLabelText('TAG'), 'TRN-003')
    await user.click(screen.getByRole('button', { name: 'Cadastrar ativo' }))

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

describe('AssetEditPage — modo edição', () => {
  it('deve preencher o formulário com o ativo carregado', async () => {
    // Arrange
    const assetMock: MockLink.MockedResponse = {
      request: { query: GET_ASSET, variables: { id: 3 } },
      result: {
        data: {
          asset: {
            id: 3,
            name: 'Injetora 03',
            tag: 'INJ-003',
            location: 'Galpão B',
            manufacturer: 'Romi',
            model: null,
            serialNumber: null,
            installDate: null,
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            deletedAt: null,
          },
        },
      },
    }

    // Act
    renderWithProviders(<AssetEditPage />, {
      route: '/assets/3/edit',
      path: '/assets/:id/edit',
      mocks: [assetMock],
    })

    // Assert
    expect(await screen.findByDisplayValue('Injetora 03')).toBeInTheDocument()
    expect(screen.getByDisplayValue('INJ-003')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Galpão B')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Romi')).toBeInTheDocument()
  })
})

describe('AssetEditPage — data de instalação', () => {
  async function openInstallDatePicker() {
    const result = renderWithProviders(<AssetEditPage />, { mocks: [assetsMock()] })
    await result.user.click(screen.getByLabelText('Data de instalação'))
    const [monthSelect, yearSelect] = screen.getAllByRole('combobox') as HTMLSelectElement[]
    return { ...result, monthSelect, yearSelect }
  }

  it('deve oferecer anos de 1990 até o ano atual, sem anos futuros', async () => {
    // Arrange / Act
    const { yearSelect } = await openInstallDatePicker()

    // Assert
    const years = Array.from(yearSelect.options, (o) => Number(o.value))
    const currentYear = new Date().getFullYear()
    expect(Math.min(...years)).toBe(1990)
    expect(Math.max(...years)).toBe(currentYear)
  })

  it('deve trocar de mês pelas setas de navegação', async () => {
    // Arrange
    const { user, monthSelect } = await openInstallDatePicker()
    const before = Number(monthSelect.value)

    // Act
    await user.click(screen.getByRole('button', { name: /previous|anterior/i }))

    // Assert
    const [monthAfter] = screen.getAllByRole('combobox') as HTMLSelectElement[]
    expect(Number(monthAfter.value)).toBe((before + 11) % 12)
  })

  it('deve permitir escolher o ano pelo seletor', async () => {
    // Arrange
    const { user, yearSelect } = await openInstallDatePicker()

    // Act
    await user.selectOptions(yearSelect, '1995')

    // Assert
    const [, yearAfter] = screen.getAllByRole('combobox') as HTMLSelectElement[]
    expect(yearAfter.value).toBe('1995')
  })
})
