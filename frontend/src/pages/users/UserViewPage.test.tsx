import { screen, waitFor, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import UserViewPage from './UserViewPage'
import { REMOVE_USER } from '../../graphql/users/DeleteUser.gql'
import { GET_USER } from '../../graphql/users/GetUser.gql'
import type { UserDetail } from '../../graphql/users/types'
import { renderWithProviders } from '../../test/renderWithProviders'

const USER: UserDetail = {
  id: 4,
  name: 'Ana Técnica',
  email: 'ana@cmms.local',
  isActive: true,
  hourlyRate: 45,
  roleId: 4,
  role: { id: 4, name: 'Technician', description: 'Técnico de manutenção', permissions: ['asset.read', 'workorder.read'], isSystem: true },
  createdAt: '2026-01-01T12:00:00.000Z',
  updatedAt: '2026-01-02T12:00:00.000Z',
  deletedAt: null,
}

const userMock: MockLink.MockedResponse = {
  request: { query: GET_USER, variables: { id: 4 } },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { user: USER } },
}

function renderPage(permissions: readonly string[], mocks: readonly MockLink.MockedResponse[] = [userMock]) {
  return renderWithProviders(<UserViewPage />, {
    route: '/dashboard/users/4',
    path: '/dashboard/users/:id',
    permissions,
    mocks,
  })
}

describe('UserViewPage', () => {
  it('deve abrir a ficha com o perfil de acesso e o resumo de permissões', async () => {
    // Arrange / Act
    renderPage(['user.read'])

    // Assert
    expect(await screen.findByRole('heading', { level: 1, name: 'Ana Técnica' })).toBeInTheDocument()
    const access = screen.getByRole('region', { name: 'Perfil de acesso' })
    expect(within(access).getByText('Técnico de manutenção')).toBeInTheDocument()
    expect(within(access).getByText('2 permissões')).toBeInTheDocument()
  })

  it('deve mostrar a taxa horária só para quem tem cost.manage', async () => {
    // Arrange / Act
    renderPage(['user.read', 'cost.manage'])

    // Assert
    const labor = await screen.findByRole('region', { name: 'Mão de obra' })
    expect(within(labor).getByText(/45,00 \/ h/)).toBeInTheDocument()
  })

  it('não deve mostrar a taxa horária sem cost.manage', async () => {
    // Arrange / Act
    renderPage(['user.read'])
    await screen.findByRole('heading', { level: 1, name: 'Ana Técnica' })

    // Assert
    expect(screen.queryByRole('region', { name: 'Mão de obra' })).toBeNull()
  })

  it('deve exibir o erro quando a exclusão falha, em vez de silenciar', async () => {
    // Arrange
    const failure: MockLink.MockedResponse = {
      request: { query: REMOVE_USER, variables: { id: 4 } },
      result: { errors: [{ message: 'Não é possível excluir o próprio usuário' }] },
    }
    const { user } = renderPage(['user.read', 'user.delete'], [userMock, failure])
    await screen.findByRole('heading', { level: 1, name: 'Ana Técnica' })

    // Act
    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('button', { name: 'Excluir usuário' }))
    await user.click(screen.getByRole('button', { name: 'Confirmar exclusão' }))

    // Assert
    const dialog = screen.getByRole('dialog', { name: 'Excluir usuário' })
    await waitFor(() =>
      expect(within(dialog).getByRole('alert')).toHaveTextContent('Não é possível excluir o próprio usuário'),
    )
  })
})
