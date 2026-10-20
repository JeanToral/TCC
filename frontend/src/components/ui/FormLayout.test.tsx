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
  it('deve renderizar um formulário com cabeçalho e filhos', () => {
    // Arrange / Act
    const { container } = render(
      <FormLayout header={<h1>Nova OS</h1>}>
        <p>conteúdo</p>
      </FormLayout>,
    )

    // Assert
    expect(container.querySelector('form')).not.toBeNull()
    expect(screen.getByRole('heading', { level: 1, name: 'Nova OS' })).toBeInTheDocument()
    expect(screen.getByText('conteúdo')).toBeInTheDocument()
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
  it('deve expor a seção como região nomeada pelo título de nível 2', () => {
    // Arrange / Act
    render(<FormSection title="Identificação">campos</FormSection>)

    // Assert
    expect(screen.getByRole('heading', { level: 2, name: 'Identificação' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'Identificação' })).toHaveTextContent('campos')
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
    expect(container.firstElementChild).toHaveAttribute('data-columns', '3')
  })

  it('deve respeitar o número de colunas informado', () => {
    // Arrange / Act
    const { container } = render(<FormGrid columns={1}>campos</FormGrid>)

    // Assert
    expect(container.firstElementChild).toHaveAttribute('data-columns', '1')
  })
})

describe('FormField', () => {
  it('deve ocupar a linha inteira com span="full"', () => {
    // Arrange / Act
    const { container } = render(<FormField span="full">campo</FormField>)

    // Assert
    expect(container.firstElementChild).toHaveAttribute('data-span', 'full')
  })

  it('não deve ocupar a linha inteira sem span', () => {
    // Arrange / Act
    const { container } = render(<FormField>campo</FormField>)

    // Assert
    expect(container.firstElementChild).not.toHaveAttribute('data-span')
  })
})

describe('FormActions', () => {
  it('deve renderizar as ações num rodapé com a legenda de obrigatórios', () => {
    // Arrange / Act
    render(
      <FormActions>
        <button type="button">Cancelar</button>
      </FormActions>,
    )

    // Assert
    expect(screen.getByRole('contentinfo')).toContainElement(screen.getByRole('button', { name: 'Cancelar' }))
    expect(screen.getByText('Campos marcados com * são obrigatórios.')).toBeInTheDocument()
  })

  it('deve omitir a legenda quando note é null', () => {
    // Arrange / Act
    render(
      <FormActions note={null}>
        <button type="button">Salvar</button>
      </FormActions>,
    )

    // Assert
    expect(screen.queryByText(/obrigatórios/)).toBeNull()
  })
})

describe('FormAlert', () => {
  it('deve expor a mensagem com role alert', () => {
    // Arrange / Act
    render(<FormAlert>Falha ao salvar</FormAlert>)

    // Assert
    expect(screen.getByRole('alert')).toHaveTextContent('Falha ao salvar')
  })

  it('deve anunciar sucesso como status, não como alerta', () => {
    // Arrange / Act
    render(<FormAlert variant="success">Perfil atualizado.</FormAlert>)

    // Assert
    expect(screen.getByRole('status')).toHaveTextContent('Perfil atualizado.')
    expect(screen.queryByRole('alert')).toBeNull()
  })
})
