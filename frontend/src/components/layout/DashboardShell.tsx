import { NavLink, Outlet } from 'react-router-dom'

import {
  BuildingIcon,
  CalendarIcon,
  ChartBarIcon,
  ClipboardListIcon,
  DashboardIcon,
  DocumentTextIcon,
  GearIcon,
  KeyIcon,
  UserGroupIcon,
} from '../icons'
import { useAuth } from '../../contexts/AuthContext'
import NotificationDropdown from './NotificationDropdown'
import UserMenu from './UserMenu'
import './DashboardShell.css'

interface NavItem {
  readonly label: string
  readonly path: string
  readonly icon: React.ReactNode
  readonly end?: boolean
  /** Quando presente, o item só aparece para quem tem esta permissão. */
  readonly permission?: string
}

const mainNav: readonly NavItem[] = [
  { label: 'Dashboard',            path: '/dashboard',                  icon: <DashboardIcon />,    end: true },
  { label: 'Ativos',               path: '/dashboard/assets',           icon: <BuildingIcon /> },
  { label: 'Ordens de Serviço',    path: '/dashboard/work-orders',      icon: <ClipboardListIcon /> },
  { label: 'Peças de Reposição',   path: '/dashboard/spare-parts',      icon: <GearIcon /> },
  { label: 'Planos Preventivos',   path: '/dashboard/preventive-plans', icon: <CalendarIcon /> },
  { label: 'Relatórios',           path: '/dashboard/reports',          icon: <ChartBarIcon />, permission: 'dashboard.read' },
]

const adminNav: readonly NavItem[] = [
  { label: 'Usuários',    path: '/dashboard/users',     icon: <UserGroupIcon />,    permission: 'user.read' },
  { label: 'Permissões',  path: '/dashboard/roles',     icon: <KeyIcon />,          permission: 'role.read' },
  { label: 'Logs',        path: '/dashboard/audit-log', icon: <DocumentTextIcon />, permission: 'auditlog.read' },
]

function SidebarNavItem({ item }: { readonly item: NavItem }) {
  return (
    <NavLink
      to={item.path}
      end={item.end}
      className={({ isActive }) =>
        `shell-nav__item${isActive ? ' shell-nav__item--active' : ''}`
      }
    >
      <span className="shell-nav__icon">{item.icon}</span>
      <span className="shell-nav__label">{item.label}</span>
    </NavLink>
  )
}

export default function DashboardShell() {
  const { hasPermission } = useAuth()
  const canSee = (item: NavItem) => !item.permission || hasPermission(item.permission)
  const visibleAdminNav = adminNav.filter(canSee)

  return (
    <div className="shell">
      {/* ── Sidebar ─────────────────────────────────── */}
      <aside className="shell__sidebar">
        <div className="shell__sidebar-logo">
          <span className="shell__sidebar-logo-icon">
            <GearIcon />
          </span>
          <span className="shell__sidebar-logo-text">CMMS</span>
        </div>

        <nav className="shell__sidebar-nav" aria-label="Navegação principal">
          <ul className="shell-nav__list" role="list">
            {mainNav
              .filter(canSee)
              .map((item) => (
                <li key={item.path}>
                  <SidebarNavItem item={item} />
                </li>
              ))}
          </ul>

          {visibleAdminNav.length > 0 && (
            <div className="shell-nav__section">
              <h2 id="shell-nav-admin" className="shell-nav__section-title">
                Administração
              </h2>
              <ul className="shell-nav__list" role="list" aria-labelledby="shell-nav-admin">
                {visibleAdminNav.map((item) => (
                  <li key={item.path}>
                    <SidebarNavItem item={item} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </nav>
      </aside>

      {/* ── Content ─────────────────────────────────── */}
      <div className="shell__body">
        <header className="shell__topbar">
          <div className="shell__topbar-left" />
          <div className="shell__topbar-right">
            <NotificationDropdown />
            <UserMenu />
          </div>
        </header>

        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
