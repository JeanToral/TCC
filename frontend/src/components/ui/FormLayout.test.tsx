import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import {
  FormActions,
  FormAlert,
  FormField,
  FormGrid,
  FormLayout,
  FormSection,
} from './FormLayout'

describe('FormLayout', () => {
  it('deve renderizar um formulário com os filhos', () => {
    // Arrange / Act
    render(
      <FormLayout>
        <p>conteúdo</p>
      </FormLayout>,
    )

    // Assert
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
    expect(document.querySelector('form.form-layout')).not.toBeNull()
  })

  it('deve encaminhar o onSubmit para o elemento form', () => {
    // Arrange
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault())
    render(
      <FormLayout onSubmit={onSubmit}>
        <button type="submit">Salvar</button>
      </FormLayout>,
    )

    // Act
    screen.getByRole('button', { name: 'Salvar' }).click()

    // Assert
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })
})

describe('FormSection', () => {
  it('deve renderizar o título como heading de nível 2', () => {
    // Arrange / Act
    render(<FormSection title="Identificação">campos</FormSection>)

    // Assert
    expect(screen.getByRole('heading', { level: 2, name: 'Identificação' })).toBeInTheDocument()
  })

  it('deve renderizar a dica quando informada', () => {
    // Arrange / Act
    render(
      <FormSection title="Permissões" hint="Selecione as permissões.">
        campos
      </FormSection>,
    )

    // Assert
    expect(screen.getByText('Selecione as permissões.')).toBeInTheDocument()
  })

  it('deve omitir o heading quando não há título', () => {
    // Arrange / Act
    render(<FormSection>campos</FormSection>)

    // Assert
    expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  })
})

describe('FormGrid', () => {
  it('deve usar até 3 colunas por padrão', () => {
    // Arrange / Act
    const { container } = render(<FormGrid>campos</FormGrid>)

    // Assert
    expect(container.querySelector('.form-grid')).toHaveClass('form-grid--3')
  })

  it('deve limitar a 2 colunas quando columns é 2', () => {
    // Arrange / Act
    const { container } = render(<FormGrid columns={2}>campos</FormGrid>)

    // Assert
    expect(container.querySelector('.form-grid')).not.toHaveClass('form-grid--3')
  })
})

describe('FormField', () => {
  it('deve ocupar a linha inteira com span="full"', () => {
    // Arrange / Act
    const { container } = render(<FormField span="full">campo</FormField>)

    // Assert
    expect(container.querySelector('.form-field')).toHaveClass('form-field--full')
  })

  it('não deve ocupar a linha inteira sem span', () => {
    // Arrange / Act
    const { container } = render(<FormField>campo</FormField>)

    // Assert
    expect(container.querySelector('.form-field')).not.toHaveClass('form-field--full')
  })
})

describe('FormActions', () => {
  it('deve renderizar as ações num rodapé', () => {
    // Arrange / Act
    const { container } = render(
      <FormActions>
        <button type="button">Cancelar</button>
      </FormActions>,
    )

    // Assert
    expect(container.querySelector('footer.form-actions')).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Cancelar' })).toBeInTheDocument()
  })
})

describe('FormAlert', () => {
  it('deve expor a mensagem com role alert', () => {
    // Arrange / Act
    render(<FormAlert>Falha ao salvar</FormAlert>)

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar')
  })

  it('deve aplicar a variante de aviso', () => {
    // Arrange / Act
    render(<FormAlert variant="warning">Atenção</FormAlert>)

    // Assert
    expect(screen.getByRole('alert')).toHaveClass('form-alert--warning')
  })
})
