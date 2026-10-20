import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import Readout, { ReadoutStrip } from './Readout'

describe('Readout', () => {
  it('deve exibir rótulo, valor, unidade e detalhe', () => {
    // Arrange / Act
    render(<Readout label="MTTR" value="4,2" unit="h" detail="Tempo médio de reparo" />)

    // Assert
    expect(screen.getByText('MTTR')).toBeInTheDocument()
    expect(screen.getByText('4,2')).toBeInTheDocument()
    expect(screen.getByText('h')).toBeInTheDocument()
    expect(screen.getByText('Tempo médio de reparo')).toBeInTheDocument()
  })

  it('deve exibir traço e omitir a unidade quando não há valor', () => {
    // Arrange / Act
    render(<Readout label="MTBF" value={null} unit="h" />)

    // Assert
    expect(screen.getByText('—')).toBeInTheDocument()
    expect(screen.queryByText('h')).toBeNull()
  })

  it('deve agrupar os mostradores numa faixa', () => {
    // Arrange / Act
    const { container } = render(
      <ReadoutStrip>
        <Readout label="A" value="1" />
        <Readout label="B" value="2" />
        <Readout label="C" value="3" />
      </ReadoutStrip>,
    )

    // Assert
    expect(container.firstElementChild?.children).toHaveLength(3)
  })
})
