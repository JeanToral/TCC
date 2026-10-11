import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'

import {
  DARK_MEDIA_QUERY,
  applyAppearance,
  readAppearance,
  resolveTheme,
  systemPrefersDark,
  writeAppearance,
} from '../lib/appearance'
import type { Appearance, ResolvedTheme, SizePreference, ThemePreference } from '../lib/appearance'

interface AppearanceContextValue extends Appearance {
  readonly resolvedTheme: ResolvedTheme
  readonly setTheme: (theme: ThemePreference) => void
  readonly setSize: (size: SizePreference) => void
}

const AppearanceContext = createContext<AppearanceContextValue | null>(null)

export function AppearanceProvider({ children }: { readonly children: ReactNode }) {
  const [appearance, setAppearance] = useState<Appearance>(readAppearance)
  const [prefersDark, setPrefersDark] = useState<boolean>(systemPrefersDark)
  const resolvedTheme: ResolvedTheme = resolveTheme(appearance.theme, prefersDark)

  useEffect(() => {
    applyAppearance(appearance)
    writeAppearance(appearance)
  }, [appearance, prefersDark])

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return
    const media = window.matchMedia(DARK_MEDIA_QUERY)
    const handleChange = (e: MediaQueryListEvent) => setPrefersDark(e.matches)
    media.addEventListener('change', handleChange)
    return () => media.removeEventListener('change', handleChange)
  }, [])

  const setTheme = useCallback((theme: ThemePreference) => {
    setAppearance((prev) => ({ ...prev, theme }))
  }, [])

  const setSize = useCallback((size: SizePreference) => {
    setAppearance((prev) => ({ ...prev, size }))
  }, [])

  const value = useMemo<AppearanceContextValue>(
    () => ({ ...appearance, resolvedTheme, setTheme, setSize }),
    [appearance, resolvedTheme, setTheme, setSize],
  )

  return <AppearanceContext.Provider value={value}>{children}</AppearanceContext.Provider>
}

export function useAppearance(): AppearanceContextValue {
  const ctx = useContext(AppearanceContext)
  if (!ctx) throw new Error('useAppearance must be used inside AppearanceProvider')
  return ctx
}
