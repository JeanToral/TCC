import { screen, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import RolesListPage from './RolesListPage'
import { GET_ROLES_MGMT } from '../../graphql/roles/GetRoles.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

const ROLES = [
  { id: 1, name: 'Sysadmin', description: 'Administrador', permissions: ['*'], isSystem: true },
  { id: 5, name: 'Supervisor', description: null, permissions: ['asset.read'], isSystem: false },
]

const rolesMock: MockLink.MockedResponse = {
  request: { query: GET_ROLES_MGMT },
  maxUsageCount: Number.POSITIVE_INFINITY,
  result: { data: { roles: ROLES } },
}

describe('RolesListPage', () => {
  it('deve listar os perfis com o resumo de permissões e o tipo', async () => {
    // Arrange / Act
    renderWithProviders(<RolesListPage />, { permissions: ['role.read'], mocks: [rolesMock] })

    // Assert
    expect(await screen.findByRole('link', { name: 'Sysadmin' })).toHaveAttribute('href', '/dashboard/roles/1')
    const rows = within(screen.getByRole('table', { name: 'Perfis de acesso' })).getAllByRole('row').slice(1)
    expect(within(rows[0]).getByText('Acesso total')).toBeInTheDocument()
    expect(within(rows[0]).getByText('Sistema')).toBeInTheDocument()
    expect(within(rows[1]).getByText('1 permissão')).toBeInTheDocument()
    expect(within(rows[1]).getByText('Personalizado')).toBeInTheDocument()
  })

  it('não deve oferecer exclusão na lista', async () => {
    // Arrange / Act
    renderWithProviders(<RolesListPage />, { permissions: ['*'], mocks: [rolesMock] })
    await screen.findByRole('link', { name: 'Sysadmin' })

    // Assert
    expect(within(screen.getByRole('table')).queryByRole('button')).toBeNull()
    expect(screen.getByRole('button', { name: 'Cadastrar perfil' })).toBeInTheDocument()
  })
})
