// ─────────────────────── Imports ────────────────────────
import { Navigate, useLocation } from 'react-router-dom'

import { useAuth } from '../../contexts/AuthContext'

// ─────────────────────── Component ───────────────────────
export default function RequireAuth({ children }: { readonly children: React.ReactNode }) {
  const { isAuthenticated } = useAuth()
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
