import * as React from 'react'

import { cn } from '@/lib/utils'

import { FIELD_CONTROL, FieldLabel, FieldMessage } from './input'

/** Até R$ 99.999.999,99. */
const MAX_DIGITS = 10

const BRL_DIGITS = new Intl.NumberFormat('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })

// ── Conversões (centavos como string de dígitos, sem zeros à esquerda) ──
/** `"1234.5"` → `"123450"`; `""` → `""`; `"0"` → `"0"`. */
function digitsFromValue(value: string): string {
  if (!value.trim()) return ''
  const amount = Number(value)
  if (Number.isNaN(amount)) return ''
  return String(Math.round(amount * 100))
}

/** `"123450"` → `"1.234,50"`; `"9"` → `"0,09"`. */
function formatDigits(digits: string): string {
  return digits ? BRL_DIGITS.format(Number(digits) / 100) : ''
}

/** `"123450"` → `"1234.50"`, o formato que os formulários convertem com `Number()`. */
function valueFromDigits(digits: string): string {
  return digits ? (Number(digits) / 100).toFixed(2) : ''
}

const countDigits = (text: string) => text.replace(/\D/g, '').length

/** Posição no texto formatado que deixa `digitsToRight` dígitos à direita do cursor. */
function caretFor(formatted: string, digitsToRight: number): number {
  let seen = 0
  for (let i = formatted.length; i > 0; i--) {
    if (seen === digitsToRight) return i
    if (/\d/.test(formatted[i - 1])) seen++
  }
  return 0
}

// ── Componente ────────────────────────────────────────────
export interface MoneyInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type' | 'defaultValue'> {
  /** Valor em reais com ponto decimal (`"1234.56"`); `""` é "sem valor", diferente de zero. */
  readonly value: string
  readonly onValueChange: (value: string) => void
  readonly label?: string
  readonly error?: string
  readonly hint?: string
}

/**
 * Campo de reais preenchido a partir dos centavos: digitar 9, 9, 9 dá
 * 0,09 → 0,99 → 9,99. O cursor anda livre; editar no meio mantém os dígitos
 * à direita dele no lugar.
 */
export const MoneyInput = React.forwardRef<HTMLInputElement, MoneyInputProps>(
  ({ value, onValueChange, label, error, hint, id, className, placeholder = '0,00', required, ...props }, ref) => {
    const autoId = React.useId()
    const inputId = id ?? autoId
    const messageId = `${inputId}-message`
    const innerRef = React.useRef<HTMLInputElement>(null)
    const pendingCaret = React.useRef<number | null>(null)
    React.useImperativeHandle(ref, () => innerRef.current as HTMLInputElement)

    const display = formatDigits(digitsFromValue(value))

    React.useLayoutEffect(() => {
      const input = innerRef.current
      if (pendingCaret.current === null || !input) return
      input.setSelectionRange(pendingCaret.current, pendingCaret.current)
      pendingCaret.current = null
    })

    /** Aplica o texto editado: reformata e devolve o cursor ao mesmo dígito. */
    function apply(raw: string, caret: number) {
      const digitsToRight = countDigits(raw.slice(caret))
      const typed = raw.replace(/\D/g, '')
      let digits = typed.replace(/^0+/, '')
      // Só zeros: digitar "0" num campo vazio é zero; apagar até sobrar zeros é vazio.
      if (!digits && typed) digits = typed.length > countDigits(display) ? '0' : ''
      // Além do limite, o React devolve o campo controlado ao valor anterior.
      if (digits.length > MAX_DIGITS) return
      const formatted = formatDigits(digits)
      pendingCaret.current = caretFor(formatted, Math.min(digitsToRight, digits.length))
      onValueChange(valueFromDigits(digits))
    }

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
      apply(e.target.value, e.target.selectionStart ?? e.target.value.length)
    }

    /** Backspace/Delete sobre `,` ou `.` apaga o dígito vizinho, não o separador. */
    function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
      props.onKeyDown?.(e)
      const input = e.currentTarget
      const start = input.selectionStart ?? 0
      if (start !== input.selectionEnd) return

      if (e.key === 'Backspace' && start > 0 && /\D/.test(display[start - 1])) {
        const target = display.slice(0, start).search(/\d\D*$/)
        if (target < 0) return
        e.preventDefault()
        apply(display.slice(0, target) + display.slice(target + 1), target)
      } else if (e.key === 'Delete' && start < display.length && /\D/.test(display[start])) {
        const offset = display.slice(start).search(/\d/)
        if (offset < 0) return
        e.preventDefault()
        const target = start + offset
        apply(display.slice(0, target) + display.slice(target + 1), start)
      }
    }

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <FieldLabel htmlFor={inputId} required={required}>
            {label}
          </FieldLabel>
        )}
        <div
          className={cn(
            FIELD_CONTROL,
            'flex h-9 items-center gap-1.5 focus-within:border-primary',
            'in-[.form-cell]:focus-within:border-transparent',
            error && 'border-error',
          )}
        >
          <span aria-hidden="true" className="font-mono text-sm text-faint">
            R$
          </span>
          <input
            {...props}
            id={inputId}
            ref={innerRef}
            type="text"
            inputMode="numeric"
            autoComplete="off"
            required={required}
            value={display}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            aria-invalid={!!error}
            aria-describedby={error || hint ? messageId : undefined}
            className={cn(
              'h-full min-w-0 flex-1 bg-transparent font-mono tabular-nums text-ink outline-none placeholder:text-faint',
              'disabled:cursor-not-allowed',
              className,
            )}
          />
        </div>
        <FieldMessage id={messageId} error={error} hint={hint} />
      </div>
    )
  },
)
MoneyInput.displayName = 'MoneyInput'
