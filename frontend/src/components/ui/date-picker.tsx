import * as React from 'react'
import { format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import { FIELD_CONTROL, FieldLabel, FieldMessage } from './input'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DatePickerProps {
  id?: string
  label?: string
  value?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  /** Primeiro dia selecionável. */
  fromDate?: Date
  /** Último dia selecionável. */
  toDate?: Date
  /** Primeiro mês do seletor de mês/ano, quando não há fromDate. Padrão: ano atual − 5. */
  startMonth?: Date
  error?: string
  hint?: string
  className?: string
}

export function DatePicker({
  id,
  label,
  value,
  onSelect,
  placeholder = 'Selecionar data',
  disabled,
  required,
  fromDate,
  toDate,
  startMonth,
  error,
  hint,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const autoId = React.useId()
  const triggerId = id ?? autoId
  const messageId = `${triggerId}-message`

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <FieldLabel htmlFor={triggerId} required={required}>
          {label}
        </FieldLabel>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={triggerId}
            type="button"
            disabled={disabled}
            aria-invalid={!!error}
            aria-describedby={error || hint ? messageId : undefined}
            className={cn(FIELD_CONTROL, 'flex h-9 items-center gap-2 text-left', !value && 'text-faint')}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
            {value
              ? format(value, 'dd/MM/yyyy', { locale: ptBR })
              : placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={(day) => {
              onSelect(day)
              setOpen(false)
            }}
            locale={ptBR}
            defaultMonth={value ?? fromDate ?? toDate}
            startMonth={fromDate ?? startMonth}
            endMonth={toDate}
            disabled={[
              ...(fromDate ? [{ before: startOfDay(fromDate) }] : []),
              ...(toDate ? [{ after: startOfDay(toDate) }] : []),
            ]}
            autoFocus
          />
        </PopoverContent>
      </Popover>
      <FieldMessage id={messageId} error={error} hint={hint} />
    </div>
  )
}
