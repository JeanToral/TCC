import type { ReactNode } from 'react'

import { cn } from '../../lib/utils'

interface ReadoutProps {
  readonly label: string
  /** Número já formatado, sem unidade. `null` vira "—". */
  readonly value: string | null
  readonly unit?: string
  /** Linha de apoio sob o valor (ex.: comparativo com o período anterior). */
  readonly detail?: ReactNode
  readonly className?: string
}

/** Mostrador: o número em destaque, a unidade separada e menor, como num painel de instrumentos. */
export default function Readout({ label, value, unit, detail, className }: ReadoutProps) {
  return (
    <div className={cn('flex min-w-0 flex-col gap-1 px-5 py-4', className)}>
      <span className="text-[0.6875rem] font-medium uppercase tracking-wider text-faint">{label}</span>
      <span className="flex items-baseline gap-1 text-ink">
        <span className="font-mono text-[1.75rem] font-semibold leading-none tabular-nums">{value ?? '—'}</span>
        {value !== null && unit && <span className="font-mono text-sm text-quiet">{unit}</span>}
      </span>
      {detail && <span className="text-xs text-quiet">{detail}</span>}
    </div>
  )
}

/** Faixa contínua de mostradores separados por régua; 2 por linha no celular. */
export function ReadoutStrip({ children, className }: { readonly children: ReactNode; readonly className?: string }) {
  return (
    <div
      className={cn(
        'grid grid-cols-2 lg:auto-cols-fr lg:grid-flow-col',
        '[&>*]:border-rule [&>*]:max-lg:border-b [&>*:nth-child(odd)]:max-lg:border-r',
        '[&>*:last-child:nth-child(odd)]:max-lg:col-span-2 [&>*:last-child:nth-child(odd)]:max-lg:border-r-0',
        '[&>*:not(:last-child)]:lg:border-r',
        className,
      )}
    >
      {children}
    </div>
  )
}
