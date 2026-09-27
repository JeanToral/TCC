import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { describe, expect, it } from 'vitest'

import UserEditPage from './UserEditPage'
import { CREATE_USER } from '../../graphql/users/CreateUser.gql'
import { GET_ROLES } from '../../graphql/users/GetRoles.gql'
import { GET_USERS } from '../../graphql/users/GetUsers.gql'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Helpers ───────────────────────────────────────────────
function rolesMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_ROLES },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        roles: [
          { id: 1, name: 'Manager', description: 'Gerente', isSystem: true },
          { id: 2, name: 'Technician', description: 'Técnico', isSystem: true },
        ],
      },
    },
  }
}

function usersMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_USERS, variables: () => true },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { users: [] } },
  }
}

describe('UserEditPage — modo criação', () => {
  it('deve renderizar todos os campos do formulário', async () => {
    // Arrange / Act
    renderWithProviders(<UserEditPage />, { mocks: [rolesMock(), usersMock()] })

    // Assert
    expect(screen.getByRole('heading', { name: 'Novo Usuário' })).toBeInTheDocument()
    expect(screen.getByLabelText('Nome completo')).toBeInTheDocument()
    expect(screen.getByLabelText('E-mail')).toBeInTheDocument()
    expect(screen.getByLabelText('Senha')).toBeInTheDocument()
    expect(screen.getByLabelText('Função')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Criar usuário' })).toBeInTheDocument()
  })

  it('não deve exibir o campo "Usuário ativo" ao criar', () => {
    // Arrange / Act
    renderWithProviders(<UserEditPage />, { mocks: [rolesMock(), usersMock()] })

    // Assert
    expect(screen.queryByLabelText('Usuário ativo')).not.toBeInTheDocument()
  })

  it('deve carregar as funções disponíveis no select', async () => {
    // Arrange / Act
    renderWithProviders(<UserEditPage />, { mocks: [rolesMock(), usersMock()] })

    // Assert
    expect(await screen.findByRole('option', { name: 'Manager' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'Technician' })).toBeInTheDocument()
  })

  it('deve exigir nome, e-mail, senha e função', async () => {
    // Arrange
    const { user } = renderWithProviders(<UserEditPage />, {
      mocks: [rolesMock(), usersMock()],
    })

    // Act
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    // Assert
    expect(await screen.findByText('Nome é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('E-mail é obrigatório.')).toBeInTheDocument()
    expect(screen.getByText('Senha é obrigatória.')).toBeInTheDocument()
    expect(screen.getByText('Selecione uma função.')).toBeInTheDocument()
  })

  it('deve rejeitar e-mail em formato inválido', async () => {
    // Arrange
    const { user } = renderWithProviders(<UserEditPage />, {
      mocks: [rolesMock(), usersMock()],
    })

    // Act
    await user.type(screen.getByLabelText('E-mail'), 'joao-arroba-empresa')
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    // Assert
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
  })

  it('deve rejeitar senha com menos de 8 caracteres', async () => {
    // Arrange
    const { user } = renderWithProviders(<UserEditPage />, {
      mocks: [rolesMock(), usersMock()],
    })

    // Act
    await user.type(screen.getByLabelText('Senha'), '1234567')
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    // Assert
    expect(
      await screen.findByText('A senha deve ter pelo menos 8 caracteres.'),
    ).toBeInTheDocument()
  })

  it('deve enviar roleId como número na mutation', async () => {
    // Arrange
    const sent: Record<string, unknown>[] = []
    const createMock: MockLink.MockedResponse = {
      request: {
        query: CREATE_USER,
        variables: (vars) => {
          sent.push(vars)
          return true
        },
      },
      result: {
        data: {
          createUser: {
            id: 10,
            name: 'João da Silva',
            email: 'joao@empresa.com',
            isActive: true,
            roleId: 2,
            role: { id: 2, name: 'Technician' },
            createdAt: '2026-01-01T00:00:00.000Z',
          },
        },
      },
    }

    const { user } = renderWithProviders(<UserEditPage />, {
      mocks: [rolesMock(), createMock, usersMock()],
    })
    await screen.findByRole('option', { name: 'Technician' })

    // Act
    await user.type(screen.getByLabelText('Nome completo'), 'João da Silva')
    await user.type(screen.getByLabelText('E-mail'), 'joao@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.selectOptions(screen.getByLabelText('Função'), '2')
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect(sent[0]).toEqual({
      input: {
        name: 'João da Silva',
        email: 'joao@empresa.com',
        password: 'senha1234',
        roleId: 2,
      },
    })
  })
})
