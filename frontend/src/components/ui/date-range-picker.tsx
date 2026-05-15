import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'
import type { DateRange } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DateRangePickerProps {
  label?: string
  value?: DateRange
  onSelect: (range: DateRange | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DateRangePicker({
  label,
  value,
  onSelect,
  placeholder = 'Selecionar período',
  disabled,
  className,
}: DateRangePickerProps) {
  const [open, setOpen] = React.useState(false)

  function formatRange(): string {
    if (!value?.from) return placeholder
    const from = format(value.from, 'dd/MM/yyyy', { locale: ptBR })
    if (!value.to) return `${from} →`
    const to = format(value.to, 'dd/MM/yyyy', { locale: ptBR })
    return `${from} → ${to}`
  }

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && (
        <span className="text-sm font-medium leading-none text-foreground">
          {label}
        </span>
      )}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
            className={cn(
              'flex h-10 w-full items-center gap-2 rounded-md border border-input px-4 text-sm',
              'bg-transparent text-left shadow-sm whitespace-nowrap',
              'hover:bg-muted',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              'disabled:cursor-not-allowed disabled:opacity-50',
              !value?.from && 'text-muted-foreground',
            )}
          >
            <CalendarIcon className="h-4 w-4 shrink-0 opacity-60" />
            {formatRange()}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="range"
            selected={value}
            onSelect={onSelect}
            locale={ptBR}
            numberOfMonths={2}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}

export type { DateRange }
