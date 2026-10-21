import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import UsersListPage from './UsersListPage'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import type { UserListItem } from '../../graphql/users/types'
import { renderWithProviders } from '../../test/renderWithProviders'

const makeUser = (overrides: Partial<UserListItem> = {}): UserListItem => ({
  id: 4,
  name: 'Ana Técnica',
  email: 'ana@cmms.local',
  isActive: true,
  roleId: 4,
  role: { id: 4, name: 'Technician' },
  createdAt: '2026-01-01T12:00:00.000Z',
  ...overrides,
})

function usersMock(users: readonly UserListItem[]): MockLink.MockedResponse {
  return { request: { query: GET_USERS }, maxUsageCount: Number.POSITIVE_INFINITY, result: { data: { users } } }
}

describe('UsersListPage', () => {
  it('deve listar nome, perfil de acesso e situação, com o nome levando à ficha', async () => {
    // Arrange / Act
    renderWithProviders(<UsersListPage />, {
      permissions: ['user.read'],
      mocks: [usersMock([makeUser(), makeUser({ id: 5, name: 'Bruno', email: 'bruno@cmms.local', isActive: false })])],
    })

    // Assert
    expect(await screen.findByRole('link', { name: 'Ana Técnica' })).toHaveAttribute('href', '/dashboard/users/4')
    expect(screen.getByRole('columnheader', { name: 'Perfil de acesso' })).toBeInTheDocument()
    const rows = within(screen.getByRole('table')).getAllByRole('row').slice(1)
    expect(within(rows[1]).getByText('Inativo')).toBeInTheDocument()
    expect(within(rows[0]).queryByRole('button')).toBeNull()
  })

  it('deve filtrar por nome ou e-mail', async () => {
    // Arrange
    const { user } = renderWithProviders(<UsersListPage />, {
      permissions: ['user.read'],
      mocks: [usersMock([makeUser(), makeUser({ id: 5, name: 'Bruno', email: 'bruno@cmms.local' })])],
    })
    await screen.findByRole('link', { name: 'Ana Técnica' })

    // Act
    await user.type(screen.getByLabelText('Buscar usuários'), 'bruno@')

    // Assert
    expect(screen.queryByRole('link', { name: 'Ana Técnica' })).toBeNull()
    expect(screen.getByRole('link', { name: 'Bruno' })).toBeInTheDocument()
  })

  it('deve oferecer o cadastro só para quem tem user.create', async () => {
    // Arrange / Act
    renderWithProviders(<UsersListPage />, { permissions: ['user.read'], mocks: [usersMock([makeUser()])] })
    await screen.findByRole('link', { name: 'Ana Técnica' })

    // Assert
    expect(screen.queryByRole('button', { name: 'Cadastrar usuário' })).toBeNull()
  })
})
