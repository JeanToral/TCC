import * as React from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { DayPicker } from 'react-day-picker'

import { cn } from '@/lib/utils'

export type CalendarProps = React.ComponentProps<typeof DayPicker>

export function Calendar({ className, classNames, showOutsideDays = true, ...props }: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn('p-3', className)}
      classNames={{
        months: 'flex flex-row gap-6',
        month: 'flex flex-col gap-4',
        month_caption: 'flex justify-center items-center h-8 relative',
        caption_label: 'text-sm font-medium',
        nav: 'absolute inset-x-0 top-0 flex justify-between items-center',
        button_previous: [
          'h-7 w-7 inline-flex items-center justify-center',
          'rounded-md border border-border text-muted-foreground',
          'hover:bg-muted hover:text-foreground',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        ].join(' '),
        button_next: [
          'h-7 w-7 inline-flex items-center justify-center',
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
          orientation === 'left'
            ? <ChevronLeft className="h-4 w-4" />
            : <ChevronRight className="h-4 w-4" />,
      }}
      {...props}
    />
  )
}

Calendar.displayName = 'Calendar'
