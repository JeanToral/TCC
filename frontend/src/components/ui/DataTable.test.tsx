import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import DataTable, { type DataTableColumn } from './DataTable'

interface Part {
  readonly id: number
  readonly code: string
  readonly name: string
  readonly quantity: number
}

const PARTS: readonly Part[] = [
  { id: 1, code: 'ROL-6205', name: 'Rolamento', quantity: 2 },
  { id: 2, code: 'FLT-AR01', name: 'Filtro de ar', quantity: 20 },
]

const COLUMNS: readonly DataTableColumn<Part>[] = [
  { key: 'code', header: 'Código', cell: (p) => p.code, link: true },
  { key: 'name', header: 'Nome', cell: (p) => p.name, mobile: 'title' },
  { key: 'qty', header: 'Qtd.', cell: (p) => p.quantity, align: 'right' },
  { key: 'act', header: 'Ação', cell: () => <button type="button">Repor</button> },
]

function renderTable(props: Partial<Parameters<typeof DataTable<Part>>[0]> = {}) {
  render(
    <MemoryRouter initialEntries={['/parts']}>
      <Routes>
        <Route
          path="/parts"
          element={
            <DataTable
              label="Peças"
              columns={COLUMNS}
              rows={PARTS}
              getRowKey={(p) => p.id}
              rowHref={(p) => `/parts/${p.id}`}
              {...props}
            />
          }
        />
        <Route path="/parts/:id" element={<p>Detalhe da peça</p>} />
      </Routes>
    </MemoryRouter>,
  )
  return { user: userEvent.setup() }
}

describe('DataTable', () => {
  it('deve renderizar cabeçalhos e uma linha por item', () => {
    // Arrange / Act
    renderTable()

    // Assert
    const table = screen.getByRole('table', { name: 'Peças' })
    const headers = within(table).getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers).toEqual(['Código', 'Nome', 'Qtd.', 'Ação'])
    expect(within(table).getAllByRole('row')).toHaveLength(3)
  })

  it('deve tornar a coluna marcada com link o alvo de teclado da linha', () => {
    // Arrange / Act
    renderTable()

    // Assert
    expect(screen.getByRole('link', { name: 'ROL-6205' })).toHaveAttribute('href', '/parts/1')
  })

  it('deve navegar ao clicar em qualquer ponto da linha', async () => {
    // Arrange
    const { user } = renderTable()

    // Act
    await user.click(screen.getByText('Filtro de ar'))

    // Assert
    expect(screen.getByText('Detalhe da peça')).toBeInTheDocument()
  })

  it('não deve navegar ao clicar num botão dentro da linha', async () => {
    // Arrange
    const { user } = renderTable()

    // Act
    await user.click(screen.getAllByRole('button', { name: 'Repor' })[0])

    // Assert
    expect(screen.getByRole('table')).toBeInTheDocument()
  })

  it('deve exibir esqueleto e anunciar carregamento enquanto não há linhas', () => {
    // Arrange / Act
    renderTable({ rows: [], loading: true })

    // Assert
    expect(screen.getByRole('table')).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent('Carregando')
  })

  it('deve trocar a tabela pelo estado vazio quando não houver linhas', () => {
    // Arrange / Act
    renderTable({ rows: [], empty: <p>Nenhuma peça cadastrada.</p> })

    // Assert
    expect(screen.queryByRole('table')).toBeNull()
    expect(screen.getByText('Nenhuma peça cadastrada.')).toBeInTheDocument()
  })
})
