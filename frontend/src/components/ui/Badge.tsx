import type { ReactNode } from 'react'

import './Badge.css'

type BadgeVariant = 'default' | 'success' | 'warning' | 'error' | 'info'

interface BadgeProps {
  readonly variant?: BadgeVariant
  readonly children: ReactNode
}

export default function Badge({ variant = 'default', children }: BadgeProps) {
  return (
    <span className={`badge badge--${variant}`}>{children}</span>
  )
}
