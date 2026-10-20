import { type ReactNode, useEffect, useId, useState } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import {
  CalendarClock,
  ChartColumn,
  ClipboardList,
  Cog,
  Factory,
  KeyRound,
  LayoutDashboard,
  Menu,
  Package,
  ScrollText,
  Users,
  X,
} from 'lucide-react'

import { useAuth } from '../../contexts/AuthContext'
import { cn } from '../../lib/utils'
import Breadcrumbs, { BreadcrumbProvider } from './Breadcrumbs'
import NotificationDropdown from './NotificationDropdown'
import UserMenu from './UserMenu'

interface NavItem {
  readonly label: string
  readonly path: string
  readonly icon: ReactNode
  readonly end?: boolean
  /** Quando presente, o item só aparece para quem tem esta permissão. */
  readonly permission?: string
}

interface NavGroup {
  readonly title: string
  readonly items: readonly NavItem[]
}

const ICON = 'size-4 shrink-0'

const NAV: readonly NavGroup[] = [
  {
    title: 'Análise',
    items: [
      { label: 'Dashboard',  path: '/dashboard',         icon: <LayoutDashboard className={ICON} />, end: true },
      { label: 'Relatórios', path: '/dashboard/reports', icon: <ChartColumn className={ICON} />, permission: 'dashboard.read' },
    ],
  },
  {
    title: 'Operação',
    items: [
      { label: 'Ordens de Serviço',  path: '/dashboard/work-orders',      icon: <ClipboardList className={ICON} /> },
      { label: 'Planos Preventivos', path: '/dashboard/preventive-plans', icon: <CalendarClock className={ICON} /> },
    ],
  },
  {
    title: 'Cadastros',
    items: [
      { label: 'Ativos',             path: '/dashboard/assets',      icon: <Factory className={ICON} /> },
      { label: 'Peças de Reposição', path: '/dashboard/spare-parts', icon: <Package className={ICON} /> },
    ],
  },
  {
    title: 'Administração',
    items: [
      { label: 'Usuários',         path: '/dashboard/users',     icon: <Users className={ICON} />,      permission: 'user.read' },
      { label: 'Perfis de acesso', path: '/dashboard/roles',     icon: <KeyRound className={ICON} />,   permission: 'role.read' },
      { label: 'Logs',             path: '/dashboard/audit-log', icon: <ScrollText className={ICON} />, permission: 'auditlog.read' },
    ],
  },
]

function SidebarGroup({ group, onNavigate }: { readonly group: NavGroup; readonly onNavigate: () => void }) {
  const titleId = useId()
  return (
    <div className="px-2">
      <h2
        id={titleId}
        className="px-3 pb-1.5 font-mono text-[0.625rem] font-medium uppercase tracking-[0.12em] text-inverse/35"
      >
        {group.title}
      </h2>
      <ul role="list" aria-labelledby={titleId} className="flex flex-col gap-px">
        {group.items.map((item) => (
          <li key={item.path}>
            <NavLink
              to={item.path}
              end={item.end}
              onClick={onNavigate}
              className={({ isActive }) =>
                cn(
                  'relative flex items-center gap-2.5 rounded-xs px-3 py-1.5 text-sm font-medium hover:no-underline',
                  isActive
                    ? 'bg-inverse/[0.07] text-inverse before:absolute before:inset-y-1 before:-left-2 before:w-[3px] before:bg-primary'
                    : 'text-inverse/60 hover:bg-inverse/5 hover:text-inverse/90',
                )
              }
            >
              {item.icon}
              <span className="truncate">{item.label}</span>
            </NavLink>
          </li>
        ))}
      </ul>
    </div>
  )
}

export default function DashboardShell() {
  const { hasPermission } = useAuth()
  const [menuOpen, setMenuOpen] = useState(false)
  const sidebarId = useId()

  const groups = NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => !item.permission || hasPermission(item.permission)),
  })).filter((group) => group.items.length > 0)

  useEffect(() => {
    if (!menuOpen) return
    function handleEscape(e: KeyboardEvent) {
      if (e.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <BreadcrumbProvider>
      <div className="min-h-screen bg-canvas">
        {menuOpen && (
          <div aria-hidden="true" className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={closeMenu} />
        )}

        <aside
          id={sidebarId}
          className={cn(
            'fixed inset-y-0 left-0 z-50 flex w-[var(--sidebar-width)] flex-col bg-sidebar transition-[translate,visibility] duration-200',
            menuOpen ? 'translate-x-0' : 'max-lg:invisible max-lg:-translate-x-full',
          )}
        >
          <div className="flex h-[var(--topbar-height)] shrink-0 items-center gap-2.5 border-b border-inverse/10 px-4">
            <span className="flex size-7 items-center justify-center rounded-xs bg-primary text-inverse">
              <Cog className="size-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col leading-none">
              <span className="text-[0.9375rem] font-semibold tracking-[0.14em] text-inverse">CMMS</span>
              <span className="mt-1 font-mono text-[0.5625rem] uppercase tracking-wider text-inverse/40">
                Controle de manutenção
              </span>
            </span>
            <button
              type="button"
              aria-label="Fechar menu"
              onClick={closeMenu}
              className="ml-auto flex size-8 items-center justify-center rounded-xs text-inverse/60 hover:bg-inverse/5 hover:text-inverse lg:hidden"
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          </div>

          <nav aria-label="Navegação principal" className="flex flex-1 flex-col gap-5 overflow-y-auto py-4 [scrollbar-width:none]">
            {groups.map((group) => (
              <SidebarGroup key={group.title} group={group} onNavigate={closeMenu} />
            ))}
          </nav>
        </aside>

        <div className="flex min-h-screen flex-col lg:pl-[var(--sidebar-width)]">
          <header className="sticky top-0 z-30 flex h-[var(--topbar-height)] shrink-0 items-center gap-3 border-b border-rule bg-sheet px-4 sm:px-6">
            <button
              type="button"
              aria-label="Abrir menu"
              aria-expanded={menuOpen}
              aria-controls={sidebarId}
              onClick={() => setMenuOpen(true)}
              className="-ml-1.5 flex size-9 items-center justify-center rounded-xs text-quiet hover:bg-subtle hover:text-ink lg:hidden"
            >
              <Menu className="size-5" aria-hidden="true" />
            </button>
            <div className="min-w-0 flex-1">
              <Breadcrumbs />
            </div>
            <div className="flex items-center gap-1">
              <NotificationDropdown />
              <UserMenu />
            </div>
          </header>

          <main className="flex-1 p-4 sm:p-6">
            <Outlet />
          </main>
        </div>
      </div>
    </BreadcrumbProvider>
  )
}
