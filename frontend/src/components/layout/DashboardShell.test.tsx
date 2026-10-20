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
  it('deve exibir a seção Administração aberta para o Sysadmin', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, { route: '/dashboard', permissions: ['*'] })

    // Assert
    const section = adminSection()
    expect(section).not.toBeNull()
    const links = within(section as HTMLElement).getAllByRole('link').map((l) => l.textContent)
    expect(links).toEqual(['Usuários', 'Perfis de acesso', 'Logs'])
    expect(within(section as HTMLElement).getByRole('link', { name: 'Logs' })).toHaveAttribute(
      'href',
      '/dashboard/audit-log',
    )
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

  it('deve agrupar a navegação em Análise, Operação, Cadastros e Administração', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, { route: '/dashboard', permissions: ['*'] })

    // Assert
    const nav = screen.getByRole('navigation', { name: 'Navegação principal' })
    const titles = within(nav).getAllByRole('heading').map((h) => h.textContent)
    expect(titles).toEqual(['Análise', 'Operação', 'Cadastros', 'Administração'])
    const operacao = screen.getByRole('list', { name: 'Operação' })
    expect(within(operacao).getAllByRole('link').map((l) => l.textContent)).toEqual([
      'Ordens de Serviço',
      'Planos Preventivos',
    ])
  })

  it('deve marcar como atual o item da rota aberta', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, { route: '/dashboard/assets', permissions: ['*'] })

    // Assert
    expect(screen.getByRole('link', { name: 'Ativos' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveAttribute('aria-current')
  })

  it('deve abrir o menu deslizante e fechá-lo com Esc', async () => {
    // Arrange
    const { user } = renderWithProviders(<DashboardShell />, { route: '/dashboard', permissions: ['*'] })
    const toggle = screen.getByRole('button', { name: 'Abrir menu' })

    // Act
    await user.click(toggle)

    // Assert
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('deve fechar o menu deslizante ao navegar', async () => {
    // Arrange
    const { user } = renderWithProviders(<DashboardShell />, { route: '/dashboard', permissions: ['*'] })
    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    await user.click(toggle)

    // Act
    await user.click(screen.getByRole('link', { name: 'Ativos' }))

    // Assert
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })

  it('deve exibir a trilha de navegação da rota atual', () => {
    // Arrange / Act
    renderWithProviders(<DashboardShell />, { route: '/dashboard/work-orders/41', permissions: ['*'] })

    // Assert
    const trail = screen.getByRole('navigation', { name: 'Trilha de navegação' })
    expect(within(trail).getByText('OS-0041')).toHaveAttribute('aria-current', 'page')
  })
})
