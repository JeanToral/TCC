// ─────────────────────── Imports ────────────────────────
import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

import { apolloClient, setAccessToken } from '../lib/apollo'
import { REFRESH_TOKEN } from '../graphql/auth/RefreshToken.gql'

// ─────────────────────── Types ───────────────────────────
interface AuthContextValue {
  readonly isAuthenticated: boolean
  readonly login: (accessToken: string) => void
  readonly logout: () => void
}

interface RefreshTokenResult {
  refreshToken: { accessToken: string }
}

// ─────────────────────── Context ─────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [initializing, setInitializing] = useState(true)

  useEffect(() => {
    apolloClient
      .mutate<RefreshTokenResult>({ mutation: REFRESH_TOKEN })
      .then(({ data }) => {
        if (data?.refreshToken?.accessToken) {
          setAccessToken(data.refreshToken.accessToken)
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
    setIsAuthenticated(true)
  }

  function logout() {
    setAccessToken('')
    setIsAuthenticated(false)
  }

  if (initializing) return null

  return (
    <AuthContext.Provider value={{ isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
