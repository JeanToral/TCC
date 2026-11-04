import * as React from 'react'
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

/** Faixa padrão dos seletores de mês e ano: ano atual ± 5. */
const YEARS_AROUND_TODAY = 5

const defaultStartMonth = () => new Date(new Date().getFullYear() - YEARS_AROUND_TODAY, 0, 1)
const defaultEndMonth = () => new Date(new Date().getFullYear() + YEARS_AROUND_TODAY, 11, 31)

export function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'dropdown',
  startMonth,
  endMonth,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      captionLayout={captionLayout}
      startMonth={startMonth ?? defaultStartMonth()}
      endMonth={endMonth ?? defaultEndMonth()}
      className={cn('p-3', className)}
      formatters={{ formatMonthDropdown: (month, dateLib) => dateLib?.format(month, 'LLL') ?? '' }}
      classNames={{
        months: 'relative flex flex-row gap-6',
        month: 'flex flex-col gap-4',
        // px-8 reserva espaço para as setas, que ficam sobre o caption
        month_caption: 'flex justify-center items-center h-8 px-8',
        caption_label: 'inline-flex items-center gap-0.5 text-sm font-medium',
        dropdowns: 'flex items-center gap-1.5',
        dropdown_root: [
          'relative rounded-md border border-border px-1.5 h-7 inline-flex items-center',
          'has-focus-visible:ring-1 has-focus-visible:ring-ring',
        ].join(' '),
        dropdown: 'absolute inset-0 cursor-pointer opacity-0',
        // O nav cobre toda a largura do mês: só as setas recebem clique
        nav: 'pointer-events-none absolute inset-x-0 top-0 z-10 flex h-8 justify-between items-center',
        button_previous: [
          'pointer-events-auto h-7 w-7 inline-flex items-center justify-center',
          'rounded-md border border-border text-muted-foreground',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        ].join(' '),
        button_next: [
          'pointer-events-auto h-7 w-7 inline-flex items-center justify-center',
          'rounded-md border border-border text-muted-foreground',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        ].join(' '),
        month_grid: 'w-full border-collapse',
        weekdays: 'flex',
        weekday: 'text-muted-foreground w-8 text-center text-[0.8rem] font-normal',
        week: 'flex w-full mt-2',
        day: 'relative p-0 text-center text-sm',
        day_button: [
          'h-8 w-8 p-0 font-normal rounded-md',
          'hover:bg-muted',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        ].join(' '),
        selected: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:hover:bg-primary [&>button]:hover:text-primary-foreground',
        today: '[&>button]:ring-1 [&>button]:ring-primary [&>button]:text-primary',
        outside: '[&:not([aria-selected])]:opacity-40',
        disabled: 'opacity-40 pointer-events-none',
        range_start: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded-r-none',
        range_end: '[&>button]:bg-primary [&>button]:text-primary-foreground [&>button]:rounded-l-none',
        range_middle: '[&>button]:bg-primary/30 [&>button]:text-foreground [&>button]:rounded-none',
        hidden: 'invisible',
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation }) =>
          orientation === 'left' ? <ChevronLeft className="h-4 w-4" />
            : orientation === 'down' ? <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'
