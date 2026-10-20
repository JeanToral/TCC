import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import EmptyState from './EmptyState'

describe('EmptyState', () => {
  it('deve exibir a mensagem e o próximo passo', () => {
    // Arrange / Act
    render(<EmptyState message="Nenhuma OS aberta no período." action={<a href="/new">Abrir OS</a>} />)

    // Assert
    expect(screen.getByText('Nenhuma OS aberta no período.')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Abrir OS' })).toHaveAttribute('href', '/new')
  })

  it('deve funcionar sem ação', () => {
    // Arrange / Act
    render(<EmptyState message="Nada por aqui." />)

    // Assert
    expect(screen.queryByRole('link')).toBeNull()
  })
})
