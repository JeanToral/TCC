import { type ReactNode, useEffect } from 'react'
import { createPortal } from 'react-dom'

import { XIcon } from '../icons'
import './Modal.css'

type ModalSize = 'sm' | 'md' | 'lg'

interface ModalProps {
  readonly open: boolean
  readonly onClose: () => void
  readonly title: string
  readonly size?: ModalSize
  readonly footer?: ReactNode
  readonly children: ReactNode
}

export default function Modal({
  open,
  onClose,
  title,
  size = 'md',
  footer,
  children,
}: ModalProps) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open, onClose])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal
      aria-labelledby="modal-title"
      onClick={onClose}
    >
      <div
        className={`modal modal--${size}`}
        onClick={(e) => e.stopPropagation()}
      >
        <header className="modal__header">
          <h2 id="modal-title" className="modal__title">
            {title}
          </h2>
          <button
            type="button"
            className="modal__close"
            onClick={onClose}
            aria-label="Fechar"
          >
            <XIcon />
          </button>
        </header>

        <div className="modal__body">{children}</div>

        {footer && <footer className="modal__footer">{footer}</footer>}
      </div>
    </div>,
    document.body,
  )
}
