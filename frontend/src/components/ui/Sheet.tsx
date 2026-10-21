import { type ReactNode, useId } from 'react'

import { cn } from '../../lib/utils'

interface SheetProps {
  readonly children: ReactNode
  readonly className?: string
}

/** Folha técnica: cantos quase retos, sem sombra, régua de 1px. Numera as seções. */
export function Sheet({ children, className }: SheetProps) {
  return (
    <div className={cn('sheet-counter rounded-xs border border-rule bg-sheet', className)}>
      {children}
    </div>
  )
}

export interface SheetMetaItem {
  readonly label: string
  readonly value: ReactNode
}

interface SheetHeaderProps {
  readonly title: ReactNode
  /** Rótulo acima do título, ex.: "Ordem de Serviço". */
  readonly eyebrow?: string
  /** Identificador em Mono, ex.: "OS-0041" ou "CMP-001". */
  readonly code?: string
  /** Bloco de identificação à direita, como no cabeçalho de um formulário. */
  readonly meta?: readonly SheetMetaItem[]
  readonly actions?: ReactNode
  readonly children?: ReactNode
}

export function SheetHeader({ title, eyebrow, code, meta, actions, children }: SheetHeaderProps) {
  return (
    <header className="flex flex-col border-b border-rule lg:flex-row">
      <div className="flex min-w-0 flex-1 flex-col gap-1 p-5">
        {eyebrow && (
          <span className="font-mono text-[0.6875rem] font-medium uppercase tracking-wider text-quiet">
            {eyebrow}
          </span>
        )}
        {code && (
          <span className="font-mono text-2xl font-semibold tabular-nums leading-tight text-ink">
            {code}
          </span>
        )}
        <h1 className={cn('text-ink', code ? 'text-base font-medium' : 'text-xl font-semibold')}>
          {title}
        </h1>
        {children}
        {actions && <div className="mt-3 flex flex-wrap items-end gap-2">{actions}</div>}
      </div>

      {meta && meta.length > 0 && (
        <dl className="grid grid-cols-2 gap-px border-t border-rule bg-rule lg:w-[28rem] lg:shrink-0 lg:border-t-0 lg:border-l">
          {meta.map((item) => (
            <div key={item.label} className="flex min-w-0 flex-col gap-0.5 bg-sheet px-4 py-2.5 odd:last:col-span-2">
              <dt className="text-[0.6875rem] font-medium uppercase tracking-wider text-faint">
                {item.label}
              </dt>
              <dd className="truncate text-sm text-ink">{item.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </header>
  )
}

interface SheetSectionProps {
  readonly title: string
  /** Nota sob o título: como o número é calculado, de onde vem o dado. */
  readonly hint?: string
  /** Conteúdo à direita da régua, ex.: um botão "Adicionar". */
  readonly aside?: ReactNode
  readonly children: ReactNode
  /** Sem recuo no corpo: o conteúdo encosta nas bordas (ex.: faixa de mostradores). */
  readonly flush?: boolean
  readonly className?: string
}

export function SheetSection({ title, hint, aside, children, flush = false, className }: SheetSectionProps) {
  const id = useId()
  return (
    <section aria-labelledby={id} className={cn('border-rule not-first:border-t [nav+&]:border-t-0', className)}>
      <div className="flex items-center justify-between gap-3 px-5 pt-4 pb-2">
        <h2
          id={id}
          className="sheet-numbered font-mono text-xs font-medium uppercase tracking-wider text-quiet"
        >
          {title}
        </h2>
        {aside}
      </div>
      {hint && <p className="-mt-1 px-5 pb-3 text-xs text-quiet">{hint}</p>}
      <div className={flush ? undefined : 'px-5 pb-5'}>{children}</div>
    </section>
  )
}
