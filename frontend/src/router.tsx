import { createBrowserRouter, Navigate } from 'react-router-dom'

import DashboardShell from './components/layout/DashboardShell'
import RequireAuth from './components/auth/RequireAuth'
import LoginPage from './pages/login/LoginPage'
import UsersListPage from './pages/users/UsersListPage'
import UserViewPage from './pages/users/UserViewPage'
import UserEditPage from './pages/users/UserEditPage'

function DashboardPage() {
  return (
    <div style={{ padding: '2rem', color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
      Dashboard em construção.
    </div>
  )
}

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/dashboard',
    element: <RequireAuth><DashboardShell /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'users',          element: <UsersListPage /> },
      { path: 'users/new',      element: <UserEditPage /> },
      { path: 'users/:id',      element: <UserViewPage /> },
      { path: 'users/:id/edit', element: <UserEditPage /> },
    ],
  },
])
