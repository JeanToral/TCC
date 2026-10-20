import type { ButtonHTMLAttributes } from 'react'
import { LoaderCircle } from 'lucide-react'

import { cn } from '../../lib/utils'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost' | 'link'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly loading?: boolean
}

const VARIANT: Record<ButtonVariant, string> = {
  primary: 'border-primary bg-primary text-inverse hover:enabled:border-primary-hover hover:enabled:bg-primary-hover',
  secondary: 'border-rule-strong bg-sheet text-ink hover:enabled:bg-subtle',
  danger: 'border-error/40 bg-sheet text-error hover:enabled:border-error hover:enabled:bg-error-soft',
  ghost: 'border-transparent bg-transparent text-quiet hover:enabled:bg-subtle hover:enabled:text-ink',
  /** Ação secundária de formulário ("Cancelar"): só texto. */
  link: 'border-transparent bg-transparent px-1! text-quiet underline-offset-4 hover:enabled:text-ink hover:enabled:underline',
}

const SIZE: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-[0.8125rem]',
  md: 'h-9 px-4 text-sm',
  lg: 'h-11 px-5 text-[0.9375rem]',
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xs border font-medium transition-colors',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary',
        'disabled:cursor-not-allowed disabled:opacity-55',
        VARIANT[variant],
        SIZE[size],
        className,
      )}
      disabled={disabled ?? loading}
      {...props}
    >
      {loading && <LoaderCircle className="size-4 shrink-0 animate-spin" aria-hidden="true" />}
      {children}
    </button>
  )
}
