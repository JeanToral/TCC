import { describe, expect, it } from 'vitest'

import { formatWorkOrderCode } from './work-order-labels'

describe('formatWorkOrderCode', () => {
  it('deve completar com zeros até 4 dígitos', () => {
    // Arrange / Act / Assert
    expect(formatWorkOrderCode(41)).toBe('OS-0041')
    expect(formatWorkOrderCode(7)).toBe('OS-0007')
  })

  it('não deve cortar números com mais de 4 dígitos', () => {
    // Arrange / Act / Assert
    expect(formatWorkOrderCode(12345)).toBe('OS-12345')
  })
})
