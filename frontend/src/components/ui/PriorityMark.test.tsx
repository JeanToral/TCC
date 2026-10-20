import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import PriorityMark from './PriorityMark'

describe('PriorityMark', () => {
  it('deve exibir a prioridade crítica como carimbo, sem barras', () => {
    // Arrange / Act
    const { container } = render(<PriorityMark priority="CRITICAL" />)

    // Assert
    expect(screen.getByText('Crítica')).toBeInTheDocument()
    expect(container.querySelector('[aria-hidden="true"]')).toBeNull()
  })

  it.each([
    ['LOW', 'Baixa', 1],
    ['MEDIUM', 'Média', 2],
    ['HIGH', 'Alta', 3],
  ] as const)('deve acender %s barras proporcionais (%s)', (priority, label, lit) => {
    // Arrange / Act
    const { container } = render(<PriorityMark priority={priority} />)

    // Assert
    expect(screen.getByText(label)).toBeInTheDocument()
    const bars = container.querySelectorAll('[aria-hidden="true"] > span')
    expect(bars).toHaveLength(3)
    expect([...bars].filter((b) => b.classList.contains('bg-body'))).toHaveLength(lit)
  })
})
