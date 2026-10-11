import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import { describe, expect, it } from 'vitest'

import UserEditPage from './UserEditPage'
import { CREATE_USER } from '../../graphql/users/CreateUser.gql'
import { GET_ROLES } from '../../graphql/users/GetRoles.gql'
import { GET_USER } from '../../graphql/users/GetUser.gql'
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

describe('UserEditPage — taxa horária (dado salarial)', () => {
  it('não deve exibir o campo de taxa horária sem a permissão cost.manage', () => {
    // Arrange / Act
    renderWithProviders(<UserEditPage />, {
      mocks: [rolesMock(), usersMock()],
      permissions: ['user.create', 'user.update'],
    })

    // Assert
    expect(screen.queryByLabelText('Taxa horária (R$)')).not.toBeInTheDocument()
  })

  it('deve exibir o campo de taxa horária com a permissão cost.manage', () => {
    // Arrange / Act
    renderWithProviders(<UserEditPage />, {
      mocks: [rolesMock(), usersMock()],
      permissions: ['user.create', 'cost.manage'],
    })

    // Assert
    expect(screen.getByLabelText('Taxa horária (R$)')).toBeInTheDocument()
  })

  it('deve enviar hourlyRate na mutation quando informado', async () => {
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
            id: 11,
            name: 'Técnico Novo',
            email: 'novo@empresa.com',
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
      permissions: ['user.create', 'cost.manage'],
    })
    await screen.findByRole('option', { name: 'Technician' })

    // Act
    await user.type(screen.getByLabelText('Nome completo'), 'Técnico Novo')
    await user.type(screen.getByLabelText('E-mail'), 'novo@empresa.com')
    await user.type(screen.getByLabelText('Senha'), 'senha1234')
    await user.selectOptions(screen.getByLabelText('Função'), '2')
    await user.type(screen.getByLabelText('Taxa horária (R$)'), '45')
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    // Assert
    await waitFor(() => expect(sent).toHaveLength(1))
    expect((sent[0].input as { hourlyRate: number }).hourlyRate).toBe(45)
  })

  it('deve rejeitar taxa horária negativa', async () => {
    // Arrange
    const { user } = renderWithProviders(<UserEditPage />, {
      mocks: [rolesMock(), usersMock()],
      permissions: ['user.create', 'cost.manage'],
    })

    // Act
    await user.type(screen.getByLabelText('Taxa horária (R$)'), '-10')
    await user.click(screen.getByRole('button', { name: 'Criar usuário' }))

    // Assert
    expect(await screen.findByText('Informe um valor válido.')).toBeInTheDocument()
  })
})

describe('UserEditPage — modo edição e erros do servidor', () => {
  it('deve preencher o formulário com o usuário carregado', async () => {
    // Arrange
    const userMock: MockLink.MockedResponse = {
      request: { query: GET_USER, variables: { id: 7 } },
      result: {
        data: {
          user: {
            id: 7,
            name: 'Maria Souza',
            email: 'maria@empresa.com',
            isActive: false,
            hourlyRate: null,
            roleId: 2,
            role: { id: 2, name: 'Technician', description: 'Técnico', permissions: [], isSystem: true },
            createdAt: '2026-01-01T00:00:00.000Z',
            updatedAt: '2026-01-01T00:00:00.000Z',
            deletedAt: null,
          },
        },
      },
    }

    // Act
    renderWithProviders(<UserEditPage />, {
      route: '/users/7/edit',
      path: '/users/:id/edit',
      mocks: [userMock, rolesMock(), usersMock()],
    })

    // Assert
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Maria Souza')
    expect(screen.getByLabelText('E-mail')).toHaveValue('maria@empresa.com')
    expect(screen.getByLabelText('Nova senha (opcional)')).toHaveValue('')
  })

  it('deve exibir a mensagem de erro devolvida pelo servidor', async () => {
    // Arrange
    const createMock: MockLink.MockedResponse = {
      request: { query: CREATE_USER, variables: () => true },
      result: { errors: [new GraphQLError('E-mail já cadastrado')] },
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
    expect(await screen.findByRole('alert')).toHaveTextContent('E-mail já cadastrado')
  })
})
