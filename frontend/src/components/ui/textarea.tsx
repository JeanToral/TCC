import * as React from 'react'

import { cn } from '@/lib/utils'

import { FIELD_CONTROL, FieldLabel } from './input'

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
  hint?: string
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, label, error, hint, id, ...props }, ref) => {
    const textareaId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

    return (
      <div className="flex flex-col gap-1.5">
        {label && (
          <FieldLabel htmlFor={textareaId} required={props.required}>
            {label}
          </FieldLabel>
        )}
        <textarea
          id={textareaId}
          ref={ref}
          aria-invalid={!!error}
          aria-describedby={error ? `${textareaId}-error` : hint ? `${textareaId}-hint` : undefined}
          className={cn(FIELD_CONTROL, 'flex min-h-20 resize-y py-2', className)}
          {...props}
        />
        {error && (
          <p id={`${textareaId}-error`} className="text-xs text-error">
            {error}
          </p>
        )}
        {hint && !error && (
          <p id={`${textareaId}-hint`} className="text-xs text-quiet">
            {hint}
          </p>
        )}
      </div>
    )
  },
)
Textarea.displayName = 'Textarea'

export { Textarea }
