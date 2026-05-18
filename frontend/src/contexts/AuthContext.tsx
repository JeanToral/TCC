// ─────────────────────── Imports ────────────────────────
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { apolloClient, setAccessToken } from '../lib/apollo'
import { REFRESH_TOKEN } from '../graphql/auth/RefreshToken.gql'

// ─────────────────────── Types ───────────────────────────
interface AuthContextValue {
  readonly isAuthenticated: boolean
  readonly permissions: readonly string[]
  readonly hasPermission: (perm: string) => boolean
  readonly login: (accessToken: string) => void
  readonly logout: () => void
}

interface RefreshTokenResult {
  refreshToken: { accessToken: string }
}

interface JwtPayload {
  sub: string
  email: string
  permissions: string[]
}

// ─────────────────────── Helpers ─────────────────────────
function decodePermissions(token: string): string[] {
  try {
    const payload = JSON.parse(atob(token.split('.')[1])) as JwtPayload
    return Array.isArray(payload.permissions) ? payload.permissions : []
  } catch {
    return []
  }
}

// ─────────────────────── Context ─────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [permissions, setPermissions] = useState<string[]>([])
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    apolloClient
      .mutate<RefreshTokenResult>({ mutation: REFRESH_TOKEN })
      .then(({ data }) => {
        if (data?.refreshToken?.accessToken) {
          const token = data.refreshToken.accessToken
          setAccessToken(token)
          setPermissions(decodePermissions(token))
          setIsAuthenticated(true)
        }
      })
      .catch(() => {
        // cookie ausente ou expirado — permanece deslogado
      })
      .finally(() => setInitializing(false))
  }, [])

  function login(accessToken: string) {
    setAccessToken(accessToken)
    setPermissions(decodePermissions(accessToken))
    setIsAuthenticated(true)
  }

  function logout() {
    setAccessToken('')
    setPermissions([])
    setIsAuthenticated(false)
  }

  const hasPermission = useCallback(
    (perm: string) => permissions.includes('*') || permissions.includes(perm),
    [permissions],
  )

  if (initializing) return null

  return (
    <AuthContext.Provider value={{ isAuthenticated, permissions, hasPermission, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
