import { describe, expect, it } from 'vitest'

import {
  defaultDateRange,
  formatHours,
  formatMonth,
  formatMonthLong,
  toPeriodFilter,
} from './period'

describe('period', () => {
  describe('defaultDateRange', () => {
    it('deve começar no dia 1º de 5 meses atrás e terminar agora', () => {
      // Arrange
      const now = new Date(2026, 9, 11, 15, 30)

      // Act
      const range = defaultDateRange(now)

      // Assert
      expect(range.from).toEqual(new Date(2026, 4, 1))
      expect(range.to).toBe(now)
    })

    it('deve atravessar a virada de ano', () => {
      // Act
      const range = defaultDateRange(new Date(2026, 1, 15))

      // Assert
      expect(range.from).toEqual(new Date(2025, 8, 1))
    })
  })

  describe('toPeriodFilter', () => {
    it('deve estender o fim até o último instante do dia escolhido', () => {
      // Arrange
      const range = { from: new Date(2026, 4, 1), to: new Date(2026, 4, 31) }

      // Act
      const filter = toPeriodFilter(range)

      // Assert
      expect(filter.from).toBe(new Date(2026, 4, 1, 0, 0, 0, 0).toISOString())
      expect(filter.to).toBe(new Date(2026, 4, 31, 23, 59, 59, 999).toISOString())
    })

    it('deve omitir as pontas não escolhidas', () => {
      expect(toPeriodFilter(undefined)).toEqual({})
      expect(toPeriodFilter({ from: new Date(2026, 4, 1), to: undefined })).toEqual({
        from: new Date(2026, 4, 1).toISOString(),
      })
    })
  })

  describe('formatMonth', () => {
    it('deve abreviar o mês em português', () => {
      expect(formatMonth('2026-05')).toBe('mai/26')
      expect(formatMonth('2025-12')).toBe('dez/25')
    })

    it('deve escrever o mês por extenso', () => {
      expect(formatMonthLong('2026-05')).toBe('maio de 2026')
    })
  })

  describe('formatHours', () => {
    it('deve escolher a unidade pela magnitude', () => {
      expect(formatHours(null)).toBe('—')
      expect(formatHours(0.75)).toBe('45min')
      expect(formatHours(4.4)).toBe('4.4h')
      expect(formatHours(48)).toBe('2.0d')
    })
  })
})
