import { screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import DashboardShell from './DashboardShell'
import { renderWithProviders } from '../../test/renderWithProviders'

vi.mock('./NotificationDropdown', () => ({ default: () => null }))
vi.mock('./UserMenu', () => ({ default: () => null }))

function adminSection() {
  return screen.queryByRole('list', { name: 'Administração' })
}

describe('DashboardShell', () => {
  it('deve exibir a seção Administração aberta, sem botão de expandir, para o Sysadmin', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, { route: '/dashboard', permissions: ['*'] })

    // Assert
    const section = adminSection()
    expect(section).not.toBeNull()
    const links = within(section as HTMLElement).getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Usuários', 'Permissões', 'Logs'])
    expect(within(section as HTMLElement).getByRole('link', { name: 'Logs' })).toHaveAttribute(
      'href',
      '/dashboard/audit-log',
    )
    expect(screen.queryByRole('button', { name: /administração/i })).toBeNull()
  })

  it('deve esconder Logs de quem não tem auditlog.read', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, {
      route: '/dashboard',
      permissions: ['user.read', 'role.read'],
    })

    // Assert
    const section = adminSection() as HTMLElement
    expect(within(section).queryByRole('link', { name: 'Logs' })).toBeNull()
    expect(within(section).getByRole('link', { name: 'Usuários' })).toBeInTheDocument()
  })

  it('deve mostrar só Logs a quem tem apenas auditlog.read', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, { route: '/dashboard', permissions: ['auditlog.read'] })

    // Assert
    const links = within(adminSection() as HTMLElement).getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Logs'])
  })

  it('deve omitir a seção Administração quando o usuário não tem nenhum item dela', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, { route: '/dashboard', permissions: ['workorder.read'] })

    // Assert
    expect(adminSection()).toBeNull()
    expect(screen.queryByText('Administração')).toBeNull()
    expect(screen.getByRole('link', { name: 'Ordens de Serviço' })).toBeInTheDocument()
  })
})
