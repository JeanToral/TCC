import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import { MoneyInput } from './money-input'

function Harness({ initial = '' }: { readonly initial?: string }) {
  const [value, setValue] = useState(initial)
  return (
    <>
      <MoneyInput id="valor" label="Valor" value={value} onValueChange={setValue} />
      <output data-testid="value">{value}</output>
    </>
  )
}

function setup(initial?: string) {
  const user = userEvent.setup()
  render(<Harness initial={initial} />)
  const input = screen.getByLabelText<HTMLInputElement>('Valor')
  const value = () => screen.getByTestId('value').textContent
  return { user, input, value }
}

describe('MoneyInput', () => {
  it('deve preencher a partir dos centavos', async () => {
    // Arrange
    const { user, input } = setup()

    // Act / Assert
    await user.type(input, '9')
    expect(input).toHaveValue('0,09')
    await user.type(input, '9')
    expect(input).toHaveValue('0,99')
    await user.type(input, '9')
    expect(input).toHaveValue('9,99')
    await user.type(input, '9')
    expect(input).toHaveValue('99,99')
  })

  it('deve formatar milhares e entregar o valor com ponto decimal', async () => {
    // Arrange
    const { user, input, value } = setup()

    // Act
    await user.type(input, '123456')

    // Assert
    expect(input).toHaveValue('1.234,56')
    expect(value()).toBe('1234.56')
  })

  it('deve exibir o valor inicial formatado', () => {
    // Arrange / Act
    const { input } = setup('45.5')

    // Assert
    expect(input).toHaveValue('45,50')
  })

  it('deve ficar vazio — não zero — ao apagar todos os dígitos', async () => {
    // Arrange
    const { user, input, value } = setup('0.99')

    // Act
    await user.click(input)
    await user.keyboard('{End}{Backspace}{Backspace}')

    // Assert
    expect(input).toHaveValue('')
    expect(value()).toBe('')
  })

  it('deve gravar zero quando o usuário digita 0', async () => {
    // Arrange
    const { user, input, value } = setup()

    // Act
    await user.type(input, '0')

    // Assert
    expect(input).toHaveValue('0,00')
    expect(value()).toBe('0.00')
  })

  it('deve inserir o dígito na posição do cursor e manter o cursor nele', async () => {
    // Arrange — "12,34": cursor entre o 1 e o 2
    const { user, input } = setup('12.34')
    await user.click(input)
    input.setSelectionRange(1, 1)

    // Act
    await user.keyboard('5')

    // Assert — 1|5|2,34 → "152,34", cursor depois do 5
    expect(input).toHaveValue('152,34')
    expect(input.selectionStart).toBe(2)
  })

  it('deve apagar o dígito anterior quando o Backspace cai sobre o separador', async () => {
    // Arrange — "1.234,56": cursor logo depois da vírgula
    const { user, input } = setup('1234.56')
    await user.click(input)
    input.setSelectionRange(6, 6)

    // Act
    await user.keyboard('{Backspace}')

    // Assert — some o 4: 12356 centavos
    expect(input).toHaveValue('123,56')
  })

  it('deve aproveitar só os dígitos ao colar', async () => {
    // Arrange
    const { user, input, value } = setup()
    await user.click(input)

    // Act
    await user.paste('R$ 1.234,56')

    // Assert
    expect(input).toHaveValue('1.234,56')
    expect(value()).toBe('1234.56')
  })

  it('deve ignorar dígitos além do limite de 10', async () => {
    // Arrange
    const { user, input } = setup()

    // Act
    await user.type(input, '12345678901')

    // Assert
    expect(input).toHaveValue('12.345.678,90')
  })
})
