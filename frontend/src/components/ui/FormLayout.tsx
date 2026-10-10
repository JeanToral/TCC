import type { FormHTMLAttributes, ReactNode } from 'react'

import { cn } from '@/lib/utils'
import './FormLayout.css'

// ── FormLayout ────────────────────────────────────────────
export interface FormLayoutProps extends FormHTMLAttributes<HTMLFormElement> {
  readonly children: ReactNode
}

export function FormLayout({ children, className, ...props }: FormLayoutProps) {
  return (
    <form className={cn('form-layout', className)} {...props}>
      {children}
    </form>
  )
}

// ── FormSection ───────────────────────────────────────────
export interface FormSectionProps {
  readonly title?: string
  readonly hint?: string
  readonly children: ReactNode
  readonly className?: string
}

export function FormSection({ title, hint, children, className }: FormSectionProps) {
  return (
    <section className={cn('form-section', className)}>
      {title && <h2 className="form-section__title">{title}</h2>}
      <div className="form-section__body">
        {hint && <p className="form-section__hint">{hint}</p>}
        {children}
      </div>
    </section>
  )
}

// ── FormGrid ──────────────────────────────────────────────
export interface FormGridProps {
  /** Máximo de colunas em telas largas. Padrão: 3. */
  readonly columns?: 2 | 3
  readonly children: ReactNode
  readonly className?: string
}

export function FormGrid({ columns = 3, children, className }: FormGridProps) {
  return (
    <div className={cn('form-grid', columns === 3 && 'form-grid--3', className)}>
      {children}
    </div>
  )
}

// ── FormField ─────────────────────────────────────────────
export interface FormFieldProps {
  /** `full` faz o campo ocupar a linha inteira do grid. */
  readonly span?: 'full'
  readonly children: ReactNode
  readonly className?: string
}

export function FormField({ span, children, className }: FormFieldProps) {
  return (
    <div className={cn('form-field', span === 'full' && 'form-field--full', className)}>
      {children}
    </div>
  )
}

// ── FormActions ───────────────────────────────────────────
export interface FormActionsProps {
  readonly children: ReactNode
  readonly className?: string
}

export function FormActions({ children, className }: FormActionsProps) {
  return <footer className={cn('form-actions', className)}>{children}</footer>
}

// ── FormAlert ─────────────────────────────────────────────
export interface FormAlertProps {
  readonly variant?: 'error' | 'warning'
  readonly children: ReactNode
}

export function FormAlert({ variant = 'error', children }: FormAlertProps) {
  return (
    <div className={cn('form-alert', `form-alert--${variant}`)} role="alert">
      {children}
    </div>
  )
}
