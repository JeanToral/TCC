import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import NotFoundPage from './NotFoundPage'

// ── Helpers ───────────────────────────────────────────────
function Crash(): never {
  throw new Error('falha de renderização')
}

function renderAt(path: string) {
  const router = createMemoryRouter(
    [
      { path: '/dashboard', element: <p>Painel</p> },
      { path: '/dashboard/crash', element: <Crash />, errorElement: <NotFoundPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
    { initialEntries: [path] },
  )
  return render(<RouterProvider router={router} />)
}

// ── Suite ─────────────────────────────────────────────────
describe('NotFoundPage', () => {
  it('deve exibir 404 com link de volta ao painel para rota inexistente', () => {
    // Arrange / Act
    renderAt('/nao-existe')

    // Assert
    expect(screen.getByRole('heading', { name: 'Página não encontrada' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Voltar ao painel' })).toHaveAttribute('href', '/dashboard')
  })

  it('deve exibir mensagem de erro quando a tela quebra', () => {
    // Arrange — o React registra o erro capturado no console
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined)

    // Act
    renderAt('/dashboard/crash')

    // Assert
    expect(screen.getByRole('heading', { name: 'Algo deu errado nesta tela' })).toBeInTheDocument()
    consoleError.mockRestore()
  })
})
