// ─────────────────────── Imports ────────────────────────
import { createContext, useContext, useState } from 'react'
import type { ReactNode } from 'react'

import { setAccessToken } from '../lib/apollo'

// ─────────────────────── Types ───────────────────────────
interface AuthContextValue {
  readonly isAuthenticated: boolean
  readonly login: (accessToken: string) => void
  readonly logout: () => void
}

// ─────────────────────── Context ─────────────────────────
const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { readonly children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  function login(accessToken: string) {
    setAccessToken(accessToken)
    setIsAuthenticated(true)
  }

  function logout() {
    setAccessToken('')
    setIsAuthenticated(false)
  }

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
