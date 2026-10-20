import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { Sheet, SheetHeader, SheetSection } from './Sheet'

describe('Sheet', () => {
  it('deve exibir código, título e o bloco de identificação como lista de termos', () => {
    // Arrange / Act
    render(
      <Sheet>
        <SheetHeader
          eyebrow="Ordem de Serviço"
          code="OS-0041"
          title="Troca de rolamento"
          meta={[
            { label: 'Tipo', value: 'Corretiva' },
            { label: 'Solicitante', value: 'Ana' },
          ]}
        />
      </Sheet>,
    )

    // Assert
    expect(screen.getByRole('heading', { level: 1, name: 'Troca de rolamento' })).toBeInTheDocument()
    expect(screen.getByText('OS-0041')).toBeInTheDocument()
    const terms = screen.getAllByRole('term').map((t) => t.textContent)
    expect(terms).toEqual(['Tipo', 'Solicitante'])
    expect(screen.getAllByRole('definition').map((d) => d.textContent)).toEqual(['Corretiva', 'Ana'])
  })

  it('não deve renderizar o bloco de identificação sem meta', () => {
    // Arrange / Act
    render(<SheetHeader title="Ativos" />)

    // Assert
    expect(screen.queryByRole('term')).toBeNull()
  })

  it('deve expor cada seção como região nomeada pelo título', () => {
    // Arrange / Act
    render(
      <Sheet>
        <SheetSection title="Dados do ativo" aside={<button type="button">Editar</button>}>
          <p>conteúdo</p>
        </SheetSection>
      </Sheet>,
    )

    // Assert
    const region = screen.getByRole('region', { name: 'Dados do ativo' })
    expect(within(region).getByText('conteúdo')).toBeInTheDocument()
    expect(within(region).getByRole('button', { name: 'Editar' })).toBeInTheDocument()
  })
})
