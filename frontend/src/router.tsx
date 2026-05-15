import { createBrowserRouter, Navigate } from 'react-router-dom'

import DashboardShell from './components/layout/DashboardShell'
import RequireAuth from './components/auth/RequireAuth'
import LoginPage from './pages/login/LoginPage'
import UsersListPage from './pages/users/UsersListPage'
import UserViewPage from './pages/users/UserViewPage'
import UserEditPage from './pages/users/UserEditPage'
import AssetsListPage from './pages/assets/AssetsListPage'
import AssetViewPage from './pages/assets/AssetViewPage'
import AssetEditPage from './pages/assets/AssetEditPage'
import WorkOrdersListPage from './pages/work-orders/WorkOrdersListPage'
import WorkOrderViewPage from './pages/work-orders/WorkOrderViewPage'
import WorkOrderCreatePage from './pages/work-orders/WorkOrderCreatePage'
import DashboardPage from './pages/dashboard/DashboardPage'

export const router = createBrowserRouter([
  { path: '/', element: <Navigate to="/login" replace /> },
  { path: '/login', element: <LoginPage /> },
  {
    path: '/dashboard',
    element: <RequireAuth><DashboardShell /></RequireAuth>,
    children: [
      { index: true, element: <DashboardPage /> },
      { path: 'users',                element: <UsersListPage /> },
      { path: 'users/new',            element: <UserEditPage /> },
      { path: 'users/:id',            element: <UserViewPage /> },
      { path: 'users/:id/edit',       element: <UserEditPage /> },
      { path: 'assets',               element: <AssetsListPage /> },
      { path: 'assets/new',           element: <AssetEditPage /> },
      { path: 'assets/:id',           element: <AssetViewPage /> },
      { path: 'assets/:id/edit',      element: <AssetEditPage /> },
      { path: 'work-orders',          element: <WorkOrdersListPage /> },
      { path: 'work-orders/new',      element: <WorkOrderCreatePage /> },
      { path: 'work-orders/:id',      element: <WorkOrderViewPage /> },
    ],
  },
])
