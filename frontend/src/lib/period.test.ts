import { describe, expect, it } from 'vitest'

import {
  atLocalNoon,
  defaultScheduleEnd,
  defaultScheduleStart,
  formatHours,
  parseDayValue,
  partialMonths,
  partialMonthsNote,
  previousPeriod,
  splitHours,
  toPeriodFilter,
  validateSchedule,
} from './period'

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
    [0.5, '30 min'],
    [4.25, '4,3 h'],
    [72, '3,0 d'],
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

describe('datas de dia', () => {
  it('deve enviar a data ao meio-dia local, sem escorregar de dia', () => {
    // Act
    const noon = atLocalNoon(new Date(2026, 9, 1))

    // Assert
    expect(noon.getDate()).toBe(1)
    expect(noon.getHours()).toBe(12)
  })

  it('deve ler pelo dia UTC tanto a data nova (meio-dia) quanto a antiga (meia-noite UTC)', () => {
    expect(parseDayValue('2026-10-01T15:00:00.000Z').getDate()).toBe(1)
    expect(parseDayValue('2026-10-01T00:00:00.000Z').getDate()).toBe(1)
  })
})

describe('agendamento', () => {
  const now = new Date(2026, 9, 24, 14, 20)

  it('deve sugerir a próxima hora cheia quando o dia é hoje', () => {
    expect(defaultScheduleStart(new Date(2026, 9, 24), now)).toEqual(new Date(2026, 9, 24, 15, 0))
  })

  it('deve sugerir 08:00 em outro dia', () => {
    expect(defaultScheduleStart(new Date(2026, 9, 27), now)).toEqual(new Date(2026, 9, 27, 8, 0))
  })

  it('deve sugerir o fim uma hora depois do início no mesmo dia', () => {
    const start = new Date(2026, 9, 27, 8, 0)
    expect(defaultScheduleEnd(new Date(2026, 9, 27), start)).toEqual(new Date(2026, 9, 27, 9, 0))
  })

  it('deve sugerir o fim no horário do início quando o dia é outro', () => {
    const start = new Date(2026, 9, 27, 10, 30)
    expect(defaultScheduleEnd(new Date(2026, 9, 28), start)).toEqual(new Date(2026, 9, 28, 10, 30))
  })

  it('deve apontar início no passado', () => {
    expect(validateSchedule(new Date(2026, 9, 24, 9, 0), undefined, now).start).toMatch(/passado/)
  })

  it('deve apontar fim antes do início', () => {
    const errors = validateSchedule(new Date(2026, 9, 27, 10), new Date(2026, 9, 27, 9), now)
    expect(errors.end).toMatch(/antes do início/)
    expect(errors.start).toBeUndefined()
  })

  it('não deve apontar erro em agendamento válido', () => {
    expect(validateSchedule(new Date(2026, 9, 24, 15), new Date(2026, 9, 24, 16), now)).toEqual({})
  })
})

describe('partialMonths', () => {
  it('deve marcar o mês em curso quando o período termina antes do fim do mês', () => {
    // Arrange
    const filter = toPeriodFilter({ from: new Date(2026, 4, 1), to: new Date(2026, 9, 24) })

    // Act
    const partial = partialMonths(filter)

    // Assert
    expect([...partial]).toEqual([['2026-10', 'até 24/10']])
    expect(partialMonthsNote(partial)).toBe('* Mês parcial: out/26 até 24/10.')
  })

  it('deve marcar o primeiro mês quando o período começa no meio dele', () => {
    const filter = toPeriodFilter({ from: new Date(2026, 4, 15), to: new Date(2026, 6, 31) })
    expect([...partialMonths(filter)]).toEqual([['2026-05', 'desde 15/05']])
  })

  it('não deve marcar nada em meses inteiros', () => {
    const filter = toPeriodFilter({ from: new Date(2026, 4, 1), to: new Date(2026, 6, 31) })
    expect(partialMonths(filter).size).toBe(0)
    expect(partialMonthsNote(partialMonths(filter))).toBeUndefined()
  })

  it('deve descrever o trecho quando o período cabe num único mês', () => {
    const filter = toPeriodFilter({ from: new Date(2026, 9, 5), to: new Date(2026, 9, 20) })
    expect([...partialMonths(filter)]).toEqual([['2026-10', 'de 05/10 a 20/10']])
  })
})
