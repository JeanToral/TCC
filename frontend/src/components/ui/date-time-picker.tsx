import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DateTimePickerProps {
  label?: string
  value?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  required?: boolean
  className?: string
}

export function DateTimePicker({
  label,
  value,
  onSelect,
  placeholder = 'Selecionar data e hora',
  disabled,
  required,
  className,
}: DateTimePickerProps) {
  const [open, setOpen] = React.useState(false)

  const timeValue = value
    ? `${String(value.getHours()).padStart(2, '0')}:${String(value.getMinutes()).padStart(2, '0')}`
    : ''

  function handleDaySelect(day: Date | undefined) {
    if (!day) {
      onSelect(undefined)
      return
    }
    const combined = new Date(day)
    if (value) {
      combined.setHours(value.getHours(), value.getMinutes(), 0, 0)
    } else {
      combined.setHours(0, 0, 0, 0)
    }
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
        <span className="text-sm font-medium leading-none text-foreground">
          {label}
          {required && <span className="ml-0.5 text-destructive" aria-hidden="true">*</span>}
        </span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-md border border-input px-4 text-sm',
              'bg-transparent text-left shadow-sm',
              'hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !value && 'text-muted-foreground',
            )}
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
            initialFocus
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
    </div>
  )
}
