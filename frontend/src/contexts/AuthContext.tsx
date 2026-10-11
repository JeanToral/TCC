// ─────────────────────── Imports ────────────────────────
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'

import { apolloClient, setAccessToken } from '../lib/apollo'
import { REFRESH_TOKEN } from '../graphql/auth/RefreshToken.gql'

// ─────────────────────── Types ───────────────────────────
interface AuthContextValue {
  readonly isAuthenticated: boolean
  readonly email: string | null
  readonly permissions: readonly string[]
  readonly hasPermission: (perm: string) => boolean
  readonly login: (accessToken: string) => void
  readonly logout: () => void
  /** Renova o access token — usado quando um dado do JWT (ex.: e-mail) muda. */
  readonly refreshSession: () => Promise<void>
}

interface RefreshTokenResult {
  refreshToken: { accessToken: string }
}

interface JwtPayload {
  sub: string
  email: string
  permissions: string[]
  exp: number
}

// ─────────────────────── Helpers ─────────────────────────
const REFRESH_BUFFER_MS = 60_000

function decodePayload(token: string): Partial<JwtPayload> {
  try {
    return JSON.parse(atob(token.split('.')[1])) as Partial<JwtPayload>
  } catch {
    return {}
  }
}

function getTokenExpiryMs(token: string): number {
  const { exp } = decodePayload(token)
  return typeof exp === 'number' ? exp * 1000 : 0
}

// ─────────────────────── Context ─────────────────────────
/** Exportado para que testes possam injetar permissões sem subir o provider real. */
export const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [permissions, setPermissions] = useState<string[]>([])
  const [initializing, setInitializing] = useState(true)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function clearTimer() {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
  }

  function logout() {
    clearTimer()
    setAccessToken('')
    setEmail(null)
    setPermissions([])
    setIsAuthenticated(false)
  }

  function applyToken(token: string) {
    const payload = decodePayload(token)
    setAccessToken(token)
    setEmail(typeof payload.email === 'string' ? payload.email : null)
    setPermissions(Array.isArray(payload.permissions) ? payload.permissions : [])
    setIsAuthenticated(true)
    clearTimer()
    const delay = getTokenExpiryMs(token) - Date.now() - REFRESH_BUFFER_MS
    if (delay > 0) {
      timerRef.current = setTimeout(() => void silentRefresh(), delay)
    }
  }

  async function silentRefresh() {
    try {
      const { data } = await apolloClient.mutate<RefreshTokenResult>({ mutation: REFRESH_TOKEN })
      const token = data?.refreshToken?.accessToken
      if (token) applyToken(token)
      else logout()
    } catch {
      logout()
    }
  }

  useEffect(() => {
    apolloClient
      .mutate<RefreshTokenResult>({ mutation: REFRESH_TOKEN })
      .then(({ data }) => {
        const token = data?.refreshToken?.accessToken
        if (token) applyToken(token)
      })
      .catch(() => {})
      .finally(() => setInitializing(false))
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => clearTimer, [])

  function login(token: string) {
    applyToken(token)
  }

  const hasPermission = useCallback(
    (perm: string) => permissions.includes('*') || permissions.includes(perm),
    [permissions],
  )

  if (initializing) return null

  return (
    <AuthContext.Provider value={{ isAuthenticated, email, permissions, hasPermission, login, logout, refreshSession: silentRefresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
