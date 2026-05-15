import { useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'

import {
  BellIcon,
  BuildingIcon,
  ChevronDownIcon,
  ClipboardListIcon,
  DashboardIcon,
  GearIcon,
  KeyIcon,
  LogOutIcon,
  UserCircleIcon,
  UserGroupIcon,
} from '../icons'
import { useAuth } from '../../contexts/AuthContext'
import './DashboardShell.css'

interface NavItem {
  readonly label: string
  readonly path: string
  readonly icon: React.ReactNode
  readonly end?: boolean
}

const mainNav: readonly NavItem[] = [
  { label: 'Dashboard',         path: '/dashboard',             icon: <DashboardIcon />,      end: true },
  { label: 'Ativos',            path: '/dashboard/assets',      icon: <BuildingIcon /> },
  { label: 'Ordens de Serviço', path: '/dashboard/work-orders', icon: <ClipboardListIcon /> },
]

const adminNav: readonly NavItem[] = [
  { label: 'Usuários',    path: '/dashboard/users', icon: <UserGroupIcon /> },
  { label: 'Permissões',  path: '/dashboard/roles', icon: <KeyIcon /> },
]

const adminPaths = adminNav.map((i) => i.path)

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
  const { pathname } = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [adminOpen, setAdminOpen] = useState(() =>
    adminPaths.some((p) => pathname.startsWith(p)),
  )

  function handleLogout() {
    logout()
    navigate('/login', { replace: true })
  }

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
            {mainNav.map((item) => (
              <li key={item.path}>
                <SidebarNavItem item={item} />
              </li>
            ))}
          </ul>

          <div className="shell-nav__section">
            <button
              type="button"
              className={`shell-nav__item shell-nav__dropdown-trigger${adminPaths.some((p) => pathname.startsWith(p)) ? ' shell-nav__item--active' : ''}`}
              onClick={() => setAdminOpen((o) => !o)}
              aria-expanded={adminOpen}
            >
              <span className="shell-nav__label">Administração</span>
              <span className={`shell-nav__chevron${adminOpen ? ' shell-nav__chevron--open' : ''}`}>
                <ChevronDownIcon />
              </span>
            </button>

            {adminOpen && (
              <ul className="shell-nav__list shell-nav__list--nested" role="list">
                {adminNav.map((item) => (
                  <li key={item.path}>
                    <SidebarNavItem item={item} />
                  </li>
                ))}
              </ul>
            )}
          </div>
        </nav>

        <div className="shell__sidebar-footer">
          <div className="shell__sidebar-user">
            <span className="shell__sidebar-user-avatar">
              <UserCircleIcon />
            </span>
          </div>
          <button
            type="button"
            className="shell__sidebar-logout"
            aria-label="Sair do sistema"
            onClick={handleLogout}
          >
            <LogOutIcon />
          </button>
        </div>
      </aside>

      {/* ── Content ─────────────────────────────────── */}
      <div className="shell__body">
        <header className="shell__topbar">
          <div className="shell__topbar-left" />
          <div className="shell__topbar-right">
            <button
              type="button"
              className="shell__topbar-btn"
              aria-label="Notificações"
            >
              <BellIcon />
            </button>
          </div>
        </header>

        <main className="shell__main">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
