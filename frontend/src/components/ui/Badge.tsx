import type { ReactNode } from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps {
  readonly variant?: BadgeVariant
  readonly children: ReactNode
}

const SWATCH: Record<BadgeVariant, string> = {
  default: 'bg-faint',
  success: 'bg-success',
  warning: 'bg-warning',
  error: 'bg-error',
  info: 'bg-info',
}

/** Tarja: a cor sinaliza no quadrado, o texto fica neutro. */
export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-xs border border-rule bg-sheet px-1.5 py-0.5 text-xs font-medium text-body">
      <span aria-hidden="true" className={`size-2 shrink-0 ${SWATCH[variant]}`} />
      {children}
    </span>
  )
}
