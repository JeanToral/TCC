import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'

import MoreActions from './MoreActions'

describe('MoreActions', () => {
  it('deve abrir o menu e executar a ação escolhida', async () => {
    // Arrange
    const onDelete = vi.fn()
    const user = userEvent.setup()
    render(<MoreActions items={[{ label: 'Excluir peça', onSelect: onDelete, danger: true }]} />)

    // Act
    await user.click(screen.getByRole('button', { name: 'Mais ações' }))
    await user.click(screen.getByRole('button', { name: 'Excluir peça' }))

    // Assert
    expect(onDelete).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('button', { name: 'Excluir peça' })).toBeNull()
  })

  it('deve desabilitar o item e explicar o motivo', async () => {
    // Arrange
    const user = userEvent.setup()
    render(
      <MoreActions items={[{ label: 'Excluir', onSelect: vi.fn(), disabledReason: 'Sem permissão' }]} />,
    )

    // Act
    await user.click(screen.getByRole('button', { name: 'Mais ações' }))

    // Assert
    const item = screen.getByRole('button', { name: 'Excluir' })
    expect(item).toBeDisabled()
    expect(item).toHaveAttribute('title', 'Sem permissão')
  })

  it('não deve renderizar nada sem itens', () => {
    // Arrange / Act
    const { container } = render(<MoreActions items={[]} />)

    // Assert
    expect(container).toBeEmptyDOMElement()
  })
})
