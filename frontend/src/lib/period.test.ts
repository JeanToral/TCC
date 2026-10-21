import { describe, expect, it } from 'vitest'

import { formatHours, previousPeriod, splitHours, toPeriodFilter } from './period'

describe('previousPeriod', () => {
  it('deve devolver o intervalo de mesma duração imediatamente anterior', () => {
    // Arrange
    const range = { from: new Date(2026, 4, 1), to: new Date(2026, 4, 31) }

    // Act
    const previous = previousPeriod(range)

    // Assert
    expect(previous).toEqual({ from: new Date(2026, 2, 31), to: new Date(2026, 3, 30) })
  })

  it('deve tratar um único dia como período de um dia', () => {
    // Arrange
    const day = new Date(2026, 9, 20)

    // Act
    const previous = previousPeriod({ from: day, to: day })

    // Assert
    expect(previous).toEqual({ from: new Date(2026, 9, 19), to: new Date(2026, 9, 19) })
  })

  it('não deve calcular com intervalo incompleto', () => {
    // Arrange / Act / Assert
    expect(previousPeriod({ from: new Date(2026, 4, 1), to: undefined })).toBeUndefined()
  })
})

describe('toPeriodFilter', () => {
  it('deve incluir o último dia inteiro', () => {
    // Arrange / Act
    const filter = toPeriodFilter({ from: new Date(2026, 4, 1, 15), to: new Date(2026, 4, 31) })

    // Assert
    expect(new Date(filter.from ?? '').getHours()).toBe(0)
    expect(new Date(filter.to ?? '').getHours()).toBe(23)
  })
})

describe('formatHours', () => {
  it.each([
    [null, '—'],
    [0.5, '30min'],
    [4.25, '4.3h'],
    [72, '3.0d'],
  ])('deve formatar %s como %s', (hours, expected) => {
    // Arrange / Act / Assert
    expect(formatHours(hours)).toBe(expected)
  })
})

describe('splitHours', () => {
  it.each([
    [null, { value: null, unit: 'h' }],
    [4.25, { value: '4,3', unit: 'h' }],
    [47, { value: '47', unit: 'h' }],
    [72, { value: '3', unit: 'd' }],
  ] as const)('deve separar %s em valor e unidade', (hours, expected) => {
    // Arrange / Act / Assert
    expect(splitHours(hours)).toEqual(expected)
  })
})
