import { screen, waitFor, within } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import RoleEditPage from './RoleEditPage'
import { CREATE_ROLE } from '../../graphql/roles/CreateRole.gql'
import { GET_ROLE } from '../../graphql/roles/GetRole.gql'
import { GET_ROLES_MGMT } from '../../graphql/roles/GetRoles.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

// Grupos de permissão renderizados hoje pela tela.
// Nota: `preventiveplan.*` existe no seed do backend mas NÃO tem grupo aqui.
const PERM_GROUP_LABELS = [
  'Usuários',
  'Roles',
  'Ativos',
  'Ordens de Serviço',
  'Peças de Reposição',
  'Dashboard',
  'Log de Auditoria',
] as const

// ── Helpers ───────────────────────────────────────────────
function rolesMgmtMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_ROLES_MGMT },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { roles: [] } },
  }
}

function roleMock(overrides: {
  readonly isSystem: boolean
  readonly permissions?: readonly string[]
}): MockLink.MockedResponse {
  return {
    request: { query: GET_ROLE, variables: { id: 1 } },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        role: {
          id: 1,
          name: 'Manager',
          description: 'Gerente de manutenção',
          permissions: overrides.permissions ?? ['asset.read'],
          isSystem: overrides.isSystem,
        },
      },
    },
  }
}

describe('RoleEditPage — modo criação', () => {
  it('deve renderizar os campos de identificação', () => {
    // Arrange / Act
    renderWithProviders(<RoleEditPage />, { mocks: [rolesMgmtMock()] })

    // Assert
    expect(screen.getByRole('heading', { name: 'Nova Role' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da role')).toBeInTheDocument()
    expect(screen.getByLabelText('Descrição (opcional)')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar role' })).toBeInTheDocument()
  })

  it('deve renderizar os 7 grupos de permissão', () => {
    // Arrange / Act
    renderWithProviders(<RoleEditPage />, { mocks: [rolesMgmtMock()] })

    // Assert
    for (const label of PERM_GROUP_LABELS) {
      expect(screen.getByLabelText(label)).toBeInTheDocument()
    }
  })

  it('deve exigir o nome da role', async () => {
    // Arrange
    const { user } = renderWithProviders(<RoleEditPage />, { mocks: [rolesMgmtMock()] })

    // Act
    await user.click(screen.getByRole('button', { name: 'Criar role' }))

    // Assert
    expect(await screen.findByText('Nome é obrigatório.')).toBeInTheDocument()
  })

  it('deve marcar todas as permissões do grupo ao marcar o cabeçalho', async () => {
    // Arrange
    const { user } = renderWithProviders(<RoleEditPage />, { mocks: [rolesMgmtMock()] })

    // Act
    await user.click(screen.getByLabelText('Dashboard'))

    // Assert — o grupo Dashboard tem uma única permissão: dashboard.read
    const dashboardGroup = screen.getByLabelText('Dashboard').closest('.role-edit-page__perm-group')
    expect(dashboardGroup).not.toBeNull()
    expect(
      within(dashboardGroup as HTMLElement).getByLabelText('Visualizar'),
    ).toBeChecked()
  })

  it('deve enviar as permissões marcadas como array na mutation', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const createMock: MockLink.MockedResponse = {
      request: {
        query: CREATE_ROLE,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          createRole: {
            id: 5,
            name: 'Supervisor',
            description: null,
            permissions: ['dashboard.read'],
            isSystem: false,
          },
        },
      },
    }

    const { user } = renderWithProviders(<RoleEditPage />, {
      mocks: [createMock, rolesMgmtMock()],
    })

    // Act
    await user.type(screen.getByLabelText('Nome da role'), 'Supervisor')
    await user.click(screen.getByLabelText('Dashboard'))
    await user.click(screen.getByRole('button', { name: 'Criar role' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        name: 'Supervisor',
        description: undefined,
        permissions: ['dashboard.read'],
      },
    })
  })
})

describe('RoleEditPage — role de sistema', () => {
  it('deve avisar que a role de sistema não pode ser editada', async () => {
    // Arrange / Act
    renderWithProviders(<RoleEditPage />, {
      route: '/roles/1',
      path: '/roles/:id',
      mocks: [roleMock({ isSystem: true }), rolesMgmtMock()],
    })

    // Assert
    expect(
      await screen.findByText('Esta é uma role de sistema e não pode ser editada.'),
    ).toBeInTheDocument()
  })

  it('deve esconder o botão de salvar em role de sistema', async () => {
    // Arrange / Act
    renderWithProviders(<RoleEditPage />, {
      route: '/roles/1',
      path: '/roles/:id',
      mocks: [roleMock({ isSystem: true }), rolesMgmtMock()],
    })
    await screen.findByText('Esta é uma role de sistema e não pode ser editada.')

    // Assert
    expect(screen.queryByRole('button', { name: 'Salvar alterações' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })

  it('deve desabilitar os campos em role de sistema', async () => {
    // Arrange / Act
    renderWithProviders(<RoleEditPage />, {
      route: '/roles/1',
      path: '/roles/:id',
      mocks: [roleMock({ isSystem: true }), rolesMgmtMock()],
    })
    await screen.findByText('Esta é uma role de sistema e não pode ser editada.')

    // Assert
    expect(screen.getByLabelText('Nome da role')).toBeDisabled()
    expect(screen.getByLabelText('Descrição (opcional)')).toBeDisabled()
    expect(screen.getByLabelText('Ativos')).toBeDisabled()
  })

  it('deve permitir salvar uma role que não é de sistema', async () => {
    // Arrange / Act
    renderWithProviders(<RoleEditPage />, {
      route: '/roles/1',
      path: '/roles/:id',
      mocks: [roleMock({ isSystem: false }), rolesMgmtMock()],
    })

    // Assert
    expect(await screen.findByRole('button', { name: 'Salvar alterações' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome da role')).toBeEnabled()
  })
})
