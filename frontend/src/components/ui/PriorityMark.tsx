import type { Priority } from '../../graphql/work-orders/types'
import { PRIORITY_LABELS, PRIORITY_LEVEL } from '../../lib/work-order-labels'

const BAR_HEIGHTS = ['h-[7px]', 'h-[10px]', 'h-[13px]'] as const

interface PriorityMarkProps {
  readonly priority: Priority
}

/** Só a crítica chama atenção (carimbo); as demais são barras de intensidade. */
export default function PriorityMark({ priority }: PriorityMarkProps) {
  if (priority === 'CRITICAL') {
    return (
      <span className="inline-flex items-center rounded-xs border-2 border-primary px-1.5 font-mono text-[0.6875rem] font-semibold uppercase leading-5 tracking-wider text-primary">
        {PRIORITY_LABELS.CRITICAL}
      </span>
    )
  }

  const level = PRIORITY_LEVEL[priority]
  return (
    <span className="inline-flex items-center gap-2 text-sm text-body">
      <span aria-hidden="true" className="flex items-end gap-0.5">
        {BAR_HEIGHTS.map((height, i) => (
          <span key={height} className={`w-1 ${height} ${i < level ? 'bg-body' : 'bg-rule-strong'}`} />
        ))}
      </span>
      {PRIORITY_LABELS[priority]}
    </span>
  )
}
