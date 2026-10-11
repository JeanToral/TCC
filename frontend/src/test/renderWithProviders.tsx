import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing/react'
import type { MockLink } from '@apollo/client/testing'
import { render, type RenderResult } from '@testing-library/react'
import { AuthContext } from '../contexts/AuthContext'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'

export interface RenderWithProvidersOptions {
  /** URL inicial. Use quando a página lê parâmetros de rota (ex.: '/assets/7/edit'). */
  readonly route?: string
  /** Padrão da rota. Obrigatório junto com `route` quando há parâmetro (ex.: '/assets/:id/edit'). */
  readonly path?: string
  /** Respostas GraphQL simuladas. */
  readonly mocks?: readonly MockLink.MockedResponse[]
  /**
   * Permissões do usuário autenticado, para telas que dependem de `useAuth`.
   * Omitido = nenhuma permissão.
   */
  readonly permissions?: readonly string[]
}

export interface RenderWithProvidersResult extends RenderResult {
  readonly user: UserEvent
}

/**
 * Renderiza um componente com Router, Apollo e autenticação simulados.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path, mocks = [], permissions = [] }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const element: ReactNode = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  )

  const auth = {
    isAuthenticated: true,
    email: 'usuario@cmms.local',
    permissions,
    hasPermission: (perm: string) => permissions.includes('*') || permissions.includes(perm),
    login: () => undefined,
    logout: () => undefined,
  }

  const result = render(
    <MockedProvider mocks={[...mocks]}>
      <AuthContext.Provider value={auth}>
        <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
      </AuthContext.Provider>
    </MockedProvider>,
  )

  return { ...result, user: userEvent.setup() }
}
