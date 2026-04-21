import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'

import './Input.css'

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  readonly label?: string
  readonly error?: string
  readonly hint?: string
  readonly leftIcon?: ReactNode
}

const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, className, id, ...props },
  ref,
) {
  const fieldId = id ?? (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined)

  const inputClasses = [
    'field__input',
    leftIcon ? 'field__input--with-icon' : '',
    error ? 'field__input--error' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  return (
    <div className="field">
      {label && (
        <label className="field__label" htmlFor={fieldId}>
          {label}
        </label>
      )}
      <div className="field__wrapper">
        {leftIcon && (
          <span className="field__icon" aria-hidden="true">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          id={fieldId}
          className={inputClasses}
          aria-describedby={
            error ? `${fieldId}-error` : hint ? `${fieldId}-hint` : undefined
          }
          aria-invalid={error ? true : undefined}
          {...props}
        />
      </div>
      {error && (
        <span id={`${fieldId}-error`} className="field__error" role="alert">
          {error}
        </span>
      )}
      {hint && !error && (
        <span id={`${fieldId}-hint`} className="field__hint">
          {hint}
        </span>
      )}
    </div>
  )
})

export default Input
