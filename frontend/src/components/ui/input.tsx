import * as React from 'react'

import { cn } from '@/lib/utils'

/** Rótulo de formulário impresso: pequeno, em cima do campo. */
export const FIELD_LABEL = 'text-[0.6875rem] font-medium uppercase leading-none tracking-wider text-quiet'

/** Fora do formulário o campo é uma caixa; dentro de uma célula (.form-cell) a célula é a caixa. */
export const FIELD_CONTROL =
  'w-full rounded-xs border border-rule-strong bg-sheet px-3 text-sm text-ink transition-colors ' +
  'placeholder:text-faint focus-visible:border-primary focus-visible:outline-none ' +
  'disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-error ' +
  'in-[.form-cell]:border-transparent in-[.form-cell]:bg-transparent in-[.form-cell]:px-0 ' +
  // Na célula, foco e erro aparecem só no sublinhado dela — nunca numa borda colada ao texto.
  'in-[.form-cell]:focus-visible:border-transparent in-[.form-cell]:aria-invalid:border-transparent'

/** O `*` vem de CSS: fica fora do nome acessível e do texto do rótulo. */
export function FieldLabel({
  htmlFor,
  required,
  children,
}: {
  readonly htmlFor?: string
  readonly required?: boolean
  readonly children: React.ReactNode
}) {
  const className = cn(FIELD_LABEL, required && "after:ml-0.5 after:text-primary after:content-['*']")
  return htmlFor ? (
    <label htmlFor={htmlFor} className={className}>
      {children}
    </label>
  ) : (
    <span className={className}>{children}</span>
  )
}

/** Erro (em vermelho) ou dica abaixo do campo; o erro tem precedência. */
export function FieldMessage({
  id,
  error,
  hint,
}: {
  readonly id: string
  readonly error?: string
  readonly hint?: string
}) {
  if (error) {
    return (
      <p id={id} className="text-xs text-error">
        {error}
      </p>
    )
  }
  if (hint) {
    return (
      <p id={id} className="text-xs text-quiet">
        {hint}
      </p>
    )
  }
  return null
}

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, label, error, hint, id, ...props }, ref) => {
    const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <FieldLabel htmlFor={inputId} required={props.required}>
            {label}
          </FieldLabel>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={cn(FIELD_CONTROL, 'flex h-9', className)}
          {...props}
        />
        {error && (
          <p id={`${inputId}-error`} className="text-xs text-error">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${inputId}-hint`} className="text-xs text-quiet">
            {hint}
          </p>
        )}
      </div>
    )
  },
)
Input.displayName = 'Input'

export { Input }
