import { screen, waitFor } from '@testing-library/react'
import type { MockLink } from '@apollo/client/testing'
import { GraphQLError } from 'graphql'
import { describe, expect, it, vi } from 'vitest'

import ProfilePage from './ProfilePage'
import { GET_ME } from '../../graphql/users/GetMe.gql'
import { UPDATE_MY_PROFILE } from '../../graphql/users/UpdateMyProfile.gql'
import type { UpdateMyProfileInput } from '../../graphql/users/types'
import { renderWithProviders } from '../../test/renderWithProviders'

// ── Helpers ───────────────────────────────────────────────
const ME = {
  __typename: 'UserType',
  id: 4,
  name: 'Ana Técnica',
  email: 'ana@cmms.local',
  role: { __typename: 'RoleType', id: 4, name: 'Technician' },
}

function meMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_ME },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: { data: { me: ME } },
  }
}

function updateMock(
  input: UpdateMyProfileInput,
  outcome: { readonly name?: string; readonly email?: string } | GraphQLError,
): MockLink.MockedResponse {
  return {
    request: { query: UPDATE_MY_PROFILE, variables: { input } },
    result:
      outcome instanceof GraphQLError
        ? { errors: [outcome] }
        : { data: { updateMyProfile: { ...ME, ...outcome } } },
  }
}

describe('ProfilePage', () => {
  it('deve carregar nome e e-mail editáveis e o papel só para leitura', async () => {
    // Arrange / Act
    renderWithProviders(<ProfilePage />, { mocks: [meMock()] })

    // Assert
    expect(await screen.findByLabelText('Nome completo')).toHaveValue('Ana Técnica')
    expect(screen.getByLabelText('E-mail')).toHaveValue('ana@cmms.local')
    expect(screen.getByLabelText('Papel')).toHaveValue('Technician')
    expect(screen.getByLabelText('Papel')).toBeDisabled()
  })

  it('não deve oferecer troca de senha', async () => {
    // Arrange / Act
    renderWithProviders(<ProfilePage />, { mocks: [meMock()] })
    await screen.findByLabelText('Nome completo')

    // Assert
    expect(screen.queryByLabelText(/nova senha/i)).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Senha atual')).not.toBeInTheDocument()
  })

  it('deve manter Salvar desabilitado enquanto nada mudou', async () => {
    // Arrange / Act
    renderWithProviders(<ProfilePage />, { mocks: [meMock()] })
    await screen.findByLabelText('Nome completo')

    // Assert
    expect(screen.getByRole('button', { name: 'Salvar alterações' })).toBeDisabled()
  })

  it('deve salvar a troca de nome sem pedir senha', async () => {
    // Arrange
    const refreshSession = vi.fn(() => Promise.resolve())
    const { user } = renderWithProviders(<ProfilePage />, {
      mocks: [meMock(), updateMock({ name: 'Ana Souza' }, { name: 'Ana Souza' })],
      refreshSession,
    })
    const nameInput = await screen.findByLabelText('Nome completo')

    // Act
    await user.clear(nameInput)
    await user.type(nameInput, 'Ana Souza')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    // Assert
    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
    expect(refreshSession).not.toHaveBeenCalled()
  })

  it('deve pedir a senha atual quando o e-mail muda', async () => {
    // Arrange
    const { user } = renderWithProviders(<ProfilePage />, { mocks: [meMock()] })
    const emailInput = await screen.findByLabelText('E-mail')

    // Act
    await user.clear(emailInput)
    await user.type(emailInput, 'ana.nova@cmms.local')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    // Assert
    expect(screen.getByLabelText('Senha atual')).toBeInTheDocument()
    expect(
      await screen.findByText('Informe a senha atual para alterar o e-mail.'),
    ).toBeInTheDocument()
  })

  it('deve trocar o e-mail com a senha e renovar a sessão', async () => {
    // Arrange
    const refreshSession = vi.fn(() => Promise.resolve())
    const input = { email: 'ana.nova@cmms.local', currentPassword: 'senhaAtual1' }
    const { user } = renderWithProviders(<ProfilePage />, {
      mocks: [meMock(), updateMock(input, { email: 'ana.nova@cmms.local' })],
      refreshSession,
    })
    const emailInput = await screen.findByLabelText('E-mail')

    // Act
    await user.clear(emailInput)
    await user.type(emailInput, 'ana.nova@cmms.local')
    await user.type(screen.getByLabelText('Senha atual'), 'senhaAtual1')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    // Assert
    expect(await screen.findByText('Perfil atualizado.')).toBeInTheDocument()
    expect(refreshSession).toHaveBeenCalledOnce()
  })

  it('deve exibir o erro do servidor quando a senha atual está errada', async () => {
    // Arrange
    const input = { email: 'ana.nova@cmms.local', currentPassword: 'errada' }
    const { user } = renderWithProviders(<ProfilePage />, {
      mocks: [meMock(), updateMock(input, new GraphQLError('Senha atual incorreta'))],
    })
    const emailInput = await screen.findByLabelText('E-mail')

    // Act
    await user.clear(emailInput)
    await user.type(emailInput, 'ana.nova@cmms.local')
    await user.type(screen.getByLabelText('Senha atual'), 'errada')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    // Assert
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Senha atual incorreta'),
    )
  })

  it('deve validar o formato do e-mail antes de enviar', async () => {
    // Arrange
    const { user } = renderWithProviders(<ProfilePage />, { mocks: [meMock()] })
    const emailInput = await screen.findByLabelText('E-mail')

    // Act
    await user.clear(emailInput)
    await user.type(emailInput, 'ana-sem-arroba')
    await user.click(screen.getByRole('button', { name: 'Salvar alterações' }))

    // Assert
    expect(await screen.findByText('Informe um e-mail válido.')).toBeInTheDocument()
  })
})
