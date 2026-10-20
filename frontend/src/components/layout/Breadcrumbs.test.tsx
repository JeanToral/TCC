import { render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import Breadcrumbs, { BreadcrumbProvider, buildCrumbs, usePageCrumb } from './Breadcrumbs'

function labels(pathname: string): string[] {
  return buildCrumbs(pathname, null).map((c) => c.label)
}

function RenamesRecord({ label }: { readonly label: string }) {
  usePageCrumb(label)
  return null
}

function renderTrail(route: string, pageLabel?: string) {
  render(
    <MemoryRouter initialEntries={[route]}>
      <BreadcrumbProvider>
        <Breadcrumbs />
        {pageLabel && <RenamesRecord label={pageLabel} />}
      </BreadcrumbProvider>
    </MemoryRouter>,
  )
  return within(screen.getByRole('navigation', { name: 'Trilha de navegação' }))
}

describe('buildCrumbs', () => {
  it.each([
    ['/dashboard', ['Dashboard']],
    ['/dashboard/assets', ['Ativos']],
    ['/dashboard/work-orders/41', ['Ordens de Serviço', 'OS-0041']],
    ['/dashboard/work-orders/new', ['Ordens de Serviço', 'Abrir OS']],
    ['/dashboard/assets/7/edit', ['Ativos', 'Nº 7', 'Editar']],
    ['/dashboard/reports/costs', ['Relatórios', 'Custos']],
    ['/dashboard/roles/3', ['Perfis de acesso', 'Nº 3']],
  ])('deve montar a trilha de %s', (pathname, expected) => {
    // Arrange / Act / Assert
    expect(labels(pathname)).toEqual(expected)
  })
})

describe('Breadcrumbs', () => {
  it('deve ligar os trechos anteriores e marcar o último como página atual', () => {
    // Arrange / Act
    const trail = renderTrail('/dashboard/assets/7/edit')

    // Assert
    expect(trail.getByRole('link', { name: 'Ativos' })).toHaveAttribute('href', '/dashboard/assets')
    expect(trail.getByRole('link', { name: 'Nº 7' })).toHaveAttribute('href', '/dashboard/assets/7')
    expect(trail.getByText('Editar')).toHaveAttribute('aria-current', 'page')
  })

  it('deve trocar o número do registro pelo nome informado pela tela', () => {
    // Arrange / Act
    const trail = renderTrail('/dashboard/assets/7/edit', 'CMP-001')

    // Assert
    expect(trail.getByRole('link', { name: 'CMP-001' })).toHaveAttribute('href', '/dashboard/assets/7')
    expect(trail.queryByText('Nº 7')).toBeNull()
  })
})
