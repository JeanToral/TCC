import type { ButtonHTMLAttributes, ReactNode } from 'react'

import { SpinnerIcon } from '../icons'
import './Button.css'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant
  readonly size?: ButtonSize
  readonly loading?: boolean
  readonly leftIcon?: ReactNode
  readonly rightIcon?: ReactNode
}

export default function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  leftIcon,
  rightIcon,
  disabled,
  className,
  children,
  ...props
}: ButtonProps) {
  const classes = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    loading ? 'btn--loading' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <button className={classes} disabled={disabled ?? loading} {...props}>
      {loading ? (
        <SpinnerIcon className="btn__spinner" />
      ) : (
        leftIcon && <span className="btn__icon btn__icon--left">{leftIcon}</span>
      )}
      {children && <span className="btn__label">{children}</span>}
      {!loading && rightIcon && (
        <span className="btn__icon btn__icon--right">{rightIcon}</span>
      )}
    </button>
  )
}
