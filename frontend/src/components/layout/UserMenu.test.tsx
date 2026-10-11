import { render, screen } from '@testing-library/react'
import { MockedProvider } from '@apollo/client/testing/react'
import type { MockLink } from '@apollo/client/testing'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import UserMenu from './UserMenu'
import { AppearanceProvider } from '../../contexts/AppearanceContext'
import { AuthContext } from '../../contexts/AuthContext'
import { GET_ME } from '../../graphql/users/GetMe.gql'
import { APPEARANCE_STORAGE_KEY } from '../../lib/appearance'

function meMock(): MockLink.MockedResponse {
  return {
    request: { query: GET_ME },
    maxUsageCount: Number.POSITIVE_INFINITY,
    result: {
      data: {
        me: {
          __typename: 'UserType',
          id: 4,
          name: 'Ana Técnica',
          email: 'tecnico@cmms.local',
          role: { __typename: 'RoleType', id: 4, name: 'Technician' },
        },
      },
    },
  }
}

function renderMenu(logout: () => void = vi.fn()) {
  const auth = {
    isAuthenticated: true,
    email: 'tecnico@cmms.local',
    permissions: [],
    hasPermission: () => false,
    login: vi.fn(),
    logout,
    refreshSession: vi.fn(() => Promise.resolve()),
  }

  render(
    <MockedProvider mocks={[meMock()]}>
      <AppearanceProvider>
        <AuthContext.Provider value={auth}>
          <MemoryRouter initialEntries={['/dashboard']}>
            <Routes>
              <Route path="/dashboard" element={<UserMenu />} />
              <Route path="/dashboard/profile" element={<p>Tela de perfil</p>} />
              <Route path="/login" element={<p>Tela de login</p>} />
            </Routes>
          </MemoryRouter>
        </AuthContext.Provider>
      </AppearanceProvider>
    </MockedProvider>,
  )

  return { user: userEvent.setup() }
}

describe('UserMenu', () => {
  beforeEach(() => {
    window.localStorage.clear()
    delete document.documentElement.dataset.theme
    delete document.documentElement.dataset.size
  })

  it('deve mostrar o e-mail do token enquanto o perfil carrega', () => {
    // Arrange / Act
    renderMenu()

    // Assert
    expect(screen.getByRole('button', { name: 'Menu do usuário' })).toHaveTextContent(
      'tecnico@cmms.local',
    )
  })

  it('deve mostrar o nome do usuário depois de carregar o perfil', async () => {
    // Arrange / Act
    renderMenu()

    // Assert
    expect(await screen.findByText('Ana Técnica')).toBeInTheDocument()
  })

  it('deve abrir com Meu perfil, Aparência e Sair', async () => {
    // Arrange
    const { user } = renderMenu()

    // Act
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    // Assert
    expect(screen.getByRole('button', { name: 'Meu perfil' })).toBeEnabled()
    expect(screen.getByText('Aparência')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Sair' })).toBeInTheDocument()
  })

  it('deve levar à página Meu perfil e fechar o menu', async () => {
    // Arrange
    const { user } = renderMenu()
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    // Act
    await user.click(screen.getByRole('button', { name: 'Meu perfil' }))

    // Assert
    expect(screen.getByText('Tela de perfil')).toBeInTheDocument()
  })

  it('deve marcar os padrões Sistema e Médio', async () => {
    // Arrange
    const { user } = renderMenu()

    // Act
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    // Assert
    expect(screen.getByRole('radio', { name: 'Sistema' })).toHaveAttribute('aria-checked', 'true')
    expect(screen.getByRole('radio', { name: 'Médio' })).toHaveAttribute('aria-checked', 'true')
  })

  it('deve aplicar e persistir o tema escuro', async () => {
    // Arrange
    const { user } = renderMenu()
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    // Act
    await user.click(screen.getByRole('radio', { name: 'Escuro' }))

    // Assert
    expect(document.documentElement.dataset.theme).toBe('dark')
    expect(screen.getByRole('radio', { name: 'Escuro' })).toHaveAttribute('aria-checked', 'true')
    expect(JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? '')).toMatchObject({
      theme: 'dark',
    })
  })

  it('deve aplicar e persistir o tamanho Grande', async () => {
    // Arrange
    const { user } = renderMenu()
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    // Act
    await user.click(screen.getByRole('radio', { name: 'Grande' }))

    // Assert
    expect(document.documentElement.dataset.size).toBe('large')
    expect(JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? '')).toMatchObject({
      size: 'large',
    })
  })

  it('deve fechar com Escape', async () => {
    // Arrange
    const { user } = renderMenu()
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    // Act
    await user.keyboard('{Escape}')

    // Assert
    expect(screen.queryByRole('dialog', { name: 'Menu do usuário' })).not.toBeInTheDocument()
  })

  it('deve encerrar a sessão e ir para o login ao clicar em Sair', async () => {
    // Arrange
    const logout = vi.fn()
    const { user } = renderMenu(logout)
    await user.click(screen.getByRole('button', { name: 'Menu do usuário' }))

    // Act
    await user.click(screen.getByRole('button', { name: 'Sair' }))

    // Assert
    expect(logout).toHaveBeenCalledOnce()
    expect(screen.getByText('Tela de login')).toBeInTheDocument()
  })
})
