import * as React from 'react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { CalendarIcon } from 'lucide-react'

import { cn } from '@/lib/utils'

import { FIELD_CONTROL, FieldLabel } from './input'
import { Calendar } from './calendar'
import { Popover, PopoverContent, PopoverTrigger } from './popover'

interface DatePickerProps {
  label?: string
  value?: Date
  onSelect: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function DatePicker({
  label,
  value,
  onSelect,
  placeholder = 'Selecionar data',
  disabled,
  className,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      {label && <FieldLabel>{label}</FieldLabel>}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled}
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
            autoFocus
          />
        </PopoverContent>
      </Popover>
    </div>
  )
}
