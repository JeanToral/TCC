import { useState } from 'react'
import { Ellipsis } from 'lucide-react'

import { cn } from '../../lib/utils'
import Button from './Button'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

export interface MoreActionItem {
  readonly label: string
  readonly onSelect: () => void
  readonly danger?: boolean
  /** Quando presente, o item aparece desabilitado com este motivo. */
  readonly disabledReason?: string
}

interface MoreActionsProps {
  readonly items: readonly MoreActionItem[]
  /** Lado do botão ao qual o menu se alinha. Use `start` quando o botão fica à esquerda. */
  readonly align?: 'start' | 'end'
}

/** Menu "⋯" para ações secundárias ou destrutivas, longe da ação principal. */
export default function MoreActions({ items, align = 'end' }: MoreActionsProps) {
  const [open, setOpen] = useState(false)
  if (items.length === 0) return null

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" aria-label="Mais ações" className="px-2">
          <Ellipsis className="size-4" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align={align} className="w-52 rounded-xs p-1">
        {items.map((item) => (
          <button
            key={item.label}
            type="button"
            disabled={!!item.disabledReason}
            title={item.disabledReason}
            onClick={() => {
              setOpen(false)
              item.onSelect()
            }}
            className={cn(
              'w-full rounded-xs px-2.5 py-2 text-left text-sm disabled:cursor-not-allowed disabled:opacity-50',
              item.danger ? 'text-error hover:enabled:bg-error-soft' : 'text-ink hover:enabled:bg-subtle',
            )}
          >
            {item.label}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  )
}
