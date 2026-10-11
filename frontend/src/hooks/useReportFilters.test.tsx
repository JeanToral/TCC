import { act, renderHook } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'

import { defaultDateRange, toPeriodFilter } from '../lib/period'
import { useReportFilters } from './useReportFilters'

function setup(url = '/dashboard') {
  const wrapper = ({ children }: { readonly children: ReactNode }) => (
    <MemoryRouter initialEntries={[url]}>{children}</MemoryRouter>
  )
  return renderHook(() => useReportFilters(), { wrapper })
}

describe('useReportFilters', () => {
  it('deve usar os últimos 6 meses quando a URL não traz período', () => {
    // Act
    const { result } = setup()

    // Assert
    expect(result.current.isDefault).toBe(true)
    expect(result.current.filter.from).toBe(toPeriodFilter(defaultDateRange()).from)
    expect(result.current.search).toBe('')
  })

  it('deve ler ativo e período da URL', () => {
    // Act
    const { result } = setup('/dashboard?assetId=3&from=2025-04-01&to=2025-06-30')

    // Assert
    expect(result.current.assetId).toBe(3)
    expect(result.current.isDefault).toBe(false)
    expect(result.current.filter).toEqual({
      assetId: 3,
      from: new Date(2025, 3, 1).toISOString(),
      to: new Date(2025, 5, 30, 23, 59, 59, 999).toISOString(),
    })
  })

  it('deve ignorar valores inválidos na URL', () => {
    // Act
    const { result } = setup('/dashboard?assetId=abc&from=ontem&to=2025-06-30')

    // Assert
    expect(result.current.assetId).toBeUndefined()
    expect(result.current.isDefault).toBe(true)
  })

  it('deve gravar o período escolhido na URL', () => {
    // Arrange
    const { result } = setup()

    // Act
    act(() => result.current.setDateRange({ from: new Date(2025, 0, 1), to: new Date(2025, 2, 31) }))

    // Assert
    expect(result.current.search).toBe('?from=2025-01-01&to=2025-03-31')
  })

  it('não deve filtrar com intervalo incompleto', () => {
    // Arrange
    const { result } = setup('/dashboard?from=2025-01-01&to=2025-03-31')

    // Act
    act(() => result.current.setDateRange({ from: new Date(2025, 4, 1), to: undefined }))

    // Assert
    expect(result.current.search).toBe('?from=2025-01-01&to=2025-03-31')
  })

  it('deve gravar e remover o ativo', () => {
    // Arrange
    const { result } = setup()

    // Act / Assert
    act(() => result.current.setAssetId(5))
    expect(result.current.search).toBe('?assetId=5')
    act(() => result.current.setAssetId(undefined))
    expect(result.current.search).toBe('')
  })

  it('deve restaurar o padrão limpando os filtros e mantendo outros parâmetros', () => {
    // Arrange
    const { result } = setup('/dashboard?assetId=3&from=2025-04-01&to=2025-06-30&tab=x')

    // Act
    act(() => result.current.reset())

    // Assert
    expect(result.current.isDefault).toBe(true)
    expect(result.current.search).toBe('?tab=x')
  })
})
