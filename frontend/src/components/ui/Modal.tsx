import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X } from 'lucide-react'

import { cn } from '../../lib/utils'

type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly size?: ModalSize
  readonly footer?: ReactNode
  readonly children: ReactNode
}

const WIDTH: Record<ModalSize, string> = {
  sm: 'max-w-[26rem]',
  md: 'max-w-[36rem]',
  lg: 'max-w-[48rem]',
}

export default function Modal({ open, onClose, title, size = 'md', footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      // Esc com um calendário (popover) aberto fecha só o calendário, não o modal.
      if (document.querySelector('[data-radix-popper-content-wrapper]')) return
      onClose()
    }
    // Captura na window: roda antes do Radix (que escuta no document) fechar o popover.
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-modal
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={cn(
          'flex max-h-[calc(100vh-2rem)] w-full flex-col rounded-xs border border-rule bg-sheet shadow-lg',
          WIDTH[size],
        )}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-rule px-5 py-3.5">
          <h2 id="modal-title" className="text-base font-semibold text-ink">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="flex size-8 items-center justify-center rounded-xs text-quiet hover:bg-subtle hover:text-ink"
          >
            <X className="size-4" aria-hidden="true" />
          </button>
        </header>

        <div className="overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-rule px-5 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body,
  )
}
