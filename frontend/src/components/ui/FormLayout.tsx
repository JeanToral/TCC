import { type FormHTMLAttributes, type ReactNode, useId } from 'react'

import { cn } from '@/lib/utils'

// ── FormLayout ────────────────────────────────────────────
export interface FormLayoutProps extends FormHTMLAttributes<HTMLFormElement> {
  /** Cabeçalho da folha, ex.: um `SheetHeader`. */
  readonly header?: ReactNode
  readonly children: ReactNode
}

/** O formulário inteiro é uma folha; as seções se numeram pela ordem. */
export function FormLayout({ header, children, className, ...props }: FormLayoutProps) {
  return (
    <form
      className={cn('sheet-counter flex w-full max-w-5xl flex-col rounded-xs border border-rule bg-sheet', className)}
      {...props}
    >
      {header}
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
  const titleId = useId()
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cn('border-rule px-5 pt-4 pb-5 [section+&]:border-t', className)}
    >
      {title && (
        <h2
          id={titleId}
          className="sheet-numbered mb-3 font-mono text-xs font-medium uppercase tracking-wider text-quiet"
        >
          {title}
        </h2>
      )}
      {hint && <p className="mb-3 text-sm text-quiet">{hint}</p>}
      {children}
    </section>
  )
}

// ── FormGrid ──────────────────────────────────────────────
export interface FormGridProps {
  /** Máximo de colunas em telas largas. Padrão: 3. */
  readonly columns?: 1 | 2 | 3
  readonly children: ReactNode
  readonly className?: string
}

const COLUMNS: Record<NonNullable<FormGridProps['columns']>, string> = {
  1: '',
  2: 'md:grid-cols-2',
  3: 'md:grid-cols-2 lg:grid-cols-3',
}

/** Grade de células com divisórias, como num formulário impresso. Linha incompleta fica em branco. */
export function FormGrid({ columns = 3, children, className }: FormGridProps) {
  return (
    <div
      data-columns={columns}
      className={cn('grid grid-cols-1 border-t border-l border-rule', COLUMNS[columns], className)}
    >
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

/** A célula é a caixa do campo: a linha inferior fica vermelha no foco e no erro. */
export function FormField({ span, children, className }: FormFieldProps) {
  return (
    <div
      data-span={span}
      className={cn(
        'form-cell min-w-0 border-r border-b border-rule bg-sheet px-4 pt-3 pb-2 transition-shadow',
        'focus-within:bg-primary/[0.03] focus-within:shadow-[inset_0_-2px_0_var(--primary)]',
        'has-[[aria-invalid=true]]:shadow-[inset_0_-2px_0_var(--error)]',
        span === 'full' && 'col-span-full',
        className,
      )}
    >
      {children}
    </div>
  )
}

// ── FormActions ───────────────────────────────────────────
export interface FormActionsProps {
  readonly children: ReactNode
  /** Texto à esquerda; por padrão, a legenda de obrigatórios. `null` remove. */
  readonly note?: ReactNode
  readonly className?: string
}

const REQUIRED_NOTE = 'Campos marcados com * são obrigatórios.'

export function FormActions({ children, note = REQUIRED_NOTE, className }: FormActionsProps) {
  const isDefaultNote = note === REQUIRED_NOTE
  return (
    <footer
      className={cn(
        'sticky bottom-0 z-10 flex flex-wrap items-center justify-end gap-x-3 gap-y-2 border-t border-rule bg-sheet px-5 py-3',
        className,
      )}
    >
      {note && (
        // A legenda padrão só aparece se o formulário tiver algum campo obrigatório.
        <p className={cn('mr-auto text-xs text-faint', isDefaultNote && 'hidden in-[form:has([required])]:block')}>
          {note}
        </p>
      )}
      {children}
    </footer>
  )
}

// ── FormAlert ─────────────────────────────────────────────
export interface FormAlertProps {
  readonly variant?: 'error' | 'warning' | 'success'
  readonly children: ReactNode
  readonly className?: string
}

const ALERT: Record<NonNullable<FormAlertProps['variant']>, string> = {
  error: 'border-error bg-error-soft text-error',
  warning: 'border-warning bg-warning-soft text-[var(--warning-text)]',
  success: 'border-success bg-success-soft text-[var(--success-text)]',
}

export function FormAlert({ variant = 'error', children, className }: FormAlertProps) {
  return (
    <div
      data-variant={variant}
      className={cn('m-5 mb-0 border-l-[3px] px-4 py-2.5 text-sm font-medium', ALERT[variant], className)}
      role={variant === 'success' ? 'status' : 'alert'}
    >
      {children}
    </div>
  )
}
