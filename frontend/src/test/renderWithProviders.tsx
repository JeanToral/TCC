import type { ReactElement, ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { MockedProvider } from '@apollo/client/testing/react'
import type { MockLink } from '@apollo/client/testing'
import { render, type RenderResult } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { UserEvent } from '@testing-library/user-event'

export interface RenderWithProvidersOptions {
  /** URL inicial. Use quando a página lê parâmetros de rota (ex.: '/assets/7/edit'). */
  readonly route?: string
  /** Padrão da rota. Obrigatório junto com `route` quando há parâmetro (ex.: '/assets/:id/edit'). */
  readonly path?: string
  /** Respostas GraphQL simuladas. */
  readonly mocks?: readonly MockLink.MockedResponse[]
}

export interface RenderWithProvidersResult extends RenderResult {
  readonly user: UserEvent
}

/**
 * Renderiza um componente com Router e Apollo simulados.
 *
 * Páginas que dependem de permissões (`useAuth`) devem mockar o módulo
 * `contexts/AuthContext` no próprio spec — o contexto não é exportado.
 */
export function renderWithProviders(
  ui: ReactElement,
  { route = '/', path, mocks = [] }: RenderWithProvidersOptions = {},
): RenderWithProvidersResult {
  const element: ReactNode = path ? (
    <Routes>
      <Route path={path} element={ui} />
    </Routes>
  ) : (
    ui
  )

  const result = render(
    <MockedProvider mocks={[...mocks]}>
      <MemoryRouter initialEntries={[route]}>{element}</MemoryRouter>
    </MockedProvider>,
  )

  return { ...result, user: userEvent.setup() }
}
