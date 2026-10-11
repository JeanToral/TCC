export type ThemePreference = 'light' | 'dark' | 'system'
export type ResolvedTheme = 'light' | 'dark'
export type SizePreference = 'small' | 'medium' | 'large'

export interface Appearance {
  readonly theme: ThemePreference
  readonly size: SizePreference
}

/** Mesma chave lida pelo script inline do index.html (evita flash antes do React). */
export const APPEARANCE_STORAGE_KEY = 'cmms.appearance'

export const DEFAULT_APPEARANCE: Appearance = { theme: 'system', size: 'medium' }

const THEMES: readonly ThemePreference[] = ['light', 'dark', 'system']
const SIZES: readonly SizePreference[] = ['small', 'medium', 'large']

export const DARK_MEDIA_QUERY = '(prefers-color-scheme: dark)'

function isTheme(value: unknown): value is ThemePreference {
  return THEMES.includes(value as ThemePreference)
}

function isSize(value: unknown): value is SizePreference {
  return SIZES.includes(value as SizePreference)
}

/** A preferência é do dispositivo; storage indisponível ou corrompido cai nos padrões. */
export function readAppearance(): Appearance {
  try {
    const raw = window.localStorage.getItem(APPEARANCE_STORAGE_KEY)
    if (!raw) return DEFAULT_APPEARANCE
    const parsed = JSON.parse(raw) as Partial<Record<keyof Appearance, unknown>>
    return {
      theme: isTheme(parsed.theme) ? parsed.theme : DEFAULT_APPEARANCE.theme,
      size: isSize(parsed.size) ? parsed.size : DEFAULT_APPEARANCE.size,
    }
  } catch {
    return DEFAULT_APPEARANCE
  }
}

export function writeAppearance(appearance: Appearance): void {
  try {
    window.localStorage.setItem(APPEARANCE_STORAGE_KEY, JSON.stringify(appearance))
  } catch {
    // Modo privado ou storage bloqueado: a escolha vale só nesta sessão.
  }
}

export function systemPrefersDark(): boolean {
  return typeof window.matchMedia === 'function' && window.matchMedia(DARK_MEDIA_QUERY).matches
}

export function resolveTheme(theme: ThemePreference, prefersDark: boolean): ResolvedTheme {
  if (theme === 'system') return prefersDark ? 'dark' : 'light'
  return theme
}

export function applyAppearance(
  appearance: Appearance,
  root: HTMLElement = document.documentElement,
): ResolvedTheme {
  const resolved = resolveTheme(appearance.theme, systemPrefersDark())
  root.dataset.theme = resolved
  root.dataset.size = appearance.size
  return resolved
}
