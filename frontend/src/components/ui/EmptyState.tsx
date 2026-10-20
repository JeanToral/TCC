import type { ReactNode } from 'react'

interface EmptyStateProps {
  readonly message: string
  /** Próximo passo, ex.: um link "Abrir OS" — só quando o usuário pode executá-lo. */
  readonly action?: ReactNode
}

export default function EmptyState({ message, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 px-5 py-12 text-center">
      <p className="text-sm text-quiet">{message}</p>
      {action}
    </div>
  )
}
