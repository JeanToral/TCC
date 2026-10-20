import { createContext, type ReactNode, useContext, useEffect, useMemo, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'

import { formatWorkOrderCode } from '../../lib/work-order-labels'

interface Crumb {
  readonly label: string
  readonly to: string
}

interface CrumbOverride {
  readonly path: string
  readonly label: string
}

const SECTION_LABELS: Record<string, string> = {
  assets: 'Ativos',
  'work-orders': 'Ordens de Serviço',
  'spare-parts': 'Peças de Reposição',
  'preventive-plans': 'Planos Preventivos',
  reports: 'Relatórios',
  users: 'Usuários',
  roles: 'Perfis de acesso',
  'audit-log': 'Logs',
  profile: 'Meu perfil',
}

const NEW_LABELS: Record<string, string> = {
  assets: 'Novo ativo',
  'work-orders': 'Nova OS',
  'spare-parts': 'Nova peça',
  'preventive-plans': 'Novo plano',
  users: 'Novo usuário',
  roles: 'Novo perfil',
}

const REPORT_TAB_LABELS: Record<string, string> = {
  'work-orders': 'Ordens de Serviço',
  reliability: 'Confiabilidade',
  sla: 'SLA',
  costs: 'Custos',
  stock: 'Estoque',
}

function recordLabel(section: string, segment: string): string {
  if (section === 'reports') return REPORT_TAB_LABELS[segment] ?? segment
  if (segment === 'new') return NEW_LABELS[section] ?? 'Novo'
  const id = Number(segment)
  if (section === 'work-orders' && Number.isInteger(id)) return formatWorkOrderCode(id)
  return `Nº ${segment}`
}

/** `/dashboard/<seção>/<registro>/<ação>` → trilha. O registro pode ser renomeado pela tela. */
export function buildCrumbs(pathname: string, override: CrumbOverride | null): readonly Crumb[] {
  const [section, record, action] = pathname.replace(/^\/dashboard\/?/, '').split('/').filter(Boolean)
  if (!section) return [{ label: 'Dashboard', to: '/dashboard' }]

  const crumbs: Crumb[] = [{ label: SECTION_LABELS[section] ?? section, to: `/dashboard/${section}` }]
  if (record) {
    const to = `/dashboard/${section}/${record}`
    crumbs.push({ label: override?.path === to ? override.label : recordLabel(section, record), to })
  }
  if (action === 'edit') crumbs.push({ label: 'Editar', to: pathname })
  return crumbs
}

interface BreadcrumbContextValue {
  readonly override: CrumbOverride | null
  readonly setOverride: (override: CrumbOverride | null) => void
}

const BreadcrumbContext = createContext<BreadcrumbContextValue | null>(null)

export function BreadcrumbProvider({ children }: { readonly children: ReactNode }) {
  const [override, setOverride] = useState<CrumbOverride | null>(null)
  const value = useMemo(() => ({ override, setOverride }), [override])
  return <BreadcrumbContext.Provider value={value}>{children}</BreadcrumbContext.Provider>
}

/** Troca "Nº 7" pelo nome real do registro (ex.: a TAG do ativo) assim que a tela o carrega. */
export function usePageCrumb(label: string | undefined): void {
  const context = useContext(BreadcrumbContext)
  const { pathname } = useLocation()
  const path = pathname.split('/').slice(0, 4).join('/')
  const setOverride = context?.setOverride

  useEffect(() => {
    if (!setOverride || !label) return
    setOverride({ path, label })
    return () => setOverride(null)
  }, [setOverride, path, label])
}

export default function Breadcrumbs() {
  const { pathname } = useLocation()
  const override = useContext(BreadcrumbContext)?.override ?? null
  const crumbs = buildCrumbs(pathname, override)

  return (
    <nav aria-label="Trilha de navegação" className="min-w-0">
      <ol className="flex min-w-0 items-center gap-1.5 text-sm">
        {crumbs.map((crumb, i) => {
          const isLast = i === crumbs.length - 1
          return (
            <li key={crumb.to} className={isLast ? 'flex min-w-0 items-center gap-1.5' : 'flex items-center gap-1.5 max-sm:hidden'}>
              {i > 0 && (
                <span aria-hidden="true" className="text-faint max-sm:hidden">
                  /
                </span>
              )}
              {isLast ? (
                <span aria-current="page" className="truncate font-medium text-ink">
                  {crumb.label}
                </span>
              ) : (
                <Link to={crumb.to} className="whitespace-nowrap text-quiet hover:text-ink hover:no-underline">
                  {crumb.label}
                </Link>
              )}
            </li>
          )
        })}
      </ol>
    </nav>
  )
}
