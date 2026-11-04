import * as React from 'react'
import { format, startOfDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import { FIELD_CONTROL, FieldLabel, FieldMessage } from './input'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DateTimePickerProps {
  id?: string
  label?: string
  value?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  /** Primeiro dia selecionável. */
  fromDate?: Date
  /** Data e hora dadas ao escolher um dia quando ainda não há valor. Padrão: 00:00. */
  defaultTime?: (day: Date) => Date
  error?: string
  className?: string
}

export function DateTimePicker({
  id,
  label,
  value,
  onSelect,
  placeholder = 'Selecionar data e hora',
  disabled,
  required,
  fromDate,
  defaultTime,
  error,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)
  const autoId = React.useId()
  const triggerId = id ?? autoId
  const messageId = `${triggerId}-message`

  const timeValue = value
    ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    : ''

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onSelect(undefined)
      return
    }
    if (!value && defaultTime) {
      onSelect(defaultTime(day))
      return
    }
    const combined = new Date(day)
    combined.setHours(value?.getHours() ?? 0, value?.getMinutes() ?? 0, 0, 0)
    onSelect(combined)
  }

  function handleTimeChange(e: React.ChangeEvent<HTMLInputElement>) {
    const [h, m] = e.target.value.split(':').map(Number)
    const base = value ? new Date(value) : new Date()
    base.setHours(h, m, 0, 0)
    onSelect(base)
  }

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
            aria-describedby={error ? messageId : undefined}
            className={cn(FIELD_CONTROL, 'flex h-9 items-center gap-2 text-left', !value && 'text-faint')}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
            {value
              ? format(value, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
              : placeholder}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value}
            onSelect={handleDaySelect}
            locale={ptBR}
            defaultMonth={value ?? fromDate}
            startMonth={fromDate}
            disabled={fromDate ? { before: startOfDay(fromDate) } : undefined}
            autoFocus
          />
          <div className="border-t border-border px-4 py-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground whitespace-nowrap">Horário</span>
            <input
              type="time"
              value={timeValue}
              onChange={handleTimeChange}
              className={cn(
                'flex-1 h-8 rounded-md border border-input bg-transparent px-3 text-sm',
                'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              )}
            />
          </div>
        </PopoverContent>
      </Popover>
      <FieldMessage id={messageId} error={error} />
    </div>
  )
}
