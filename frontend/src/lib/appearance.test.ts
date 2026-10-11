import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import {
  APPEARANCE_STORAGE_KEY,
  DEFAULT_APPEARANCE,
  applyAppearance,
  readAppearance,
  resolveTheme,
  writeAppearance,
} from './appearance'

function mockPrefersDark(matches: boolean): void {
  vi.spyOn(window, 'matchMedia').mockImplementation(
    (query: string) =>
      ({
        matches,
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }) as MediaQueryList,
  )
}

describe('appearance', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('readAppearance', () => {
    it('deve devolver os padrões (Sistema / Médio) quando nada foi salvo', () => {
      // Act
      const result = readAppearance()

      // Assert
      expect(result).toEqual({ theme: 'system', size: 'medium' })
    })

    it('deve devolver a preferência salva', () => {
      // Arrange
      window.localStorage.setItem(
        APPEARANCE_STORAGE_KEY,
        JSON.stringify({ theme: 'dark', size: 'large' }),
      )

      // Act
      const result = readAppearance()

      // Assert
      expect(result).toEqual({ theme: 'dark', size: 'large' })
    })

    it('deve usar o padrão no campo com valor desconhecido', () => {
      // Arrange
      window.localStorage.setItem(
        APPEARANCE_STORAGE_KEY,
        JSON.stringify({ theme: 'sepia', size: 'small' }),
      )

      // Act
      const result = readAppearance()

      // Assert
      expect(result).toEqual({ theme: DEFAULT_APPEARANCE.theme, size: 'small' })
    })

    it('deve cair nos padrões quando o JSON salvo está corrompido', () => {
      // Arrange
      window.localStorage.setItem(APPEARANCE_STORAGE_KEY, '{nao-e-json')

      // Act
      const result = readAppearance()

      // Assert
      expect(result).toEqual(DEFAULT_APPEARANCE)
    })

    it('deve cair nos padrões quando o localStorage lança erro', () => {
      // Arrange
      vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
        throw new Error('SecurityError')
      })

      // Act
      const result = readAppearance()

      // Assert
      expect(result).toEqual(DEFAULT_APPEARANCE)
    })
  })

  describe('writeAppearance', () => {
    it('deve persistir a preferência no localStorage', () => {
      // Act
      writeAppearance({ theme: 'light', size: 'small' })

      // Assert
      expect(JSON.parse(window.localStorage.getItem(APPEARANCE_STORAGE_KEY) ?? '')).toEqual({
        theme: 'light',
        size: 'small',
      })
    })

    it('não deve lançar erro quando o localStorage está bloqueado', () => {
      // Arrange
      vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new Error('QuotaExceededError')
      })

      // Act / Assert
      expect(() => writeAppearance({ theme: 'dark', size: 'medium' })).not.toThrow()
    })
  })

  describe('resolveTheme', () => {
    it('deve seguir o sistema quando a preferência é Sistema', () => {
      expect(resolveTheme('system', true)).toBe('dark')
      expect(resolveTheme('system', false)).toBe('light')
    })

    it('deve ignorar o sistema quando o tema é explícito', () => {
      expect(resolveTheme('light', true)).toBe('light')
      expect(resolveTheme('dark', false)).toBe('dark')
    })
  })

  describe('applyAppearance', () => {
    it('deve aplicar tema resolvido e tamanho no elemento raiz', () => {
      // Arrange
      mockPrefersDark(true)
      const root = document.createElement('html')

      // Act
      const resolved = applyAppearance({ theme: 'system', size: 'large' }, root)

      // Assert
      expect(resolved).toBe('dark')
      expect(root.dataset.theme).toBe('dark')
      expect(root.dataset.size).toBe('large')
    })
  })
})
