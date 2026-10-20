import { Check } from 'lucide-react'

import type { WorkOrderDetail, WorkOrderStatus } from '../../graphql/work-orders/types'
import { cn } from '../../lib/utils'

type StepState = 'done' | 'current' | 'pending'

interface FlowStep {
  readonly label: string
  /** Status em que a OS está parada nesta etapa. */
  readonly status: WorkOrderStatus
  readonly date: (wo: WorkOrderDetail) => string | null
  readonly datePrefix?: string
}

/** Pedido → Aprovação → Planejamento → Execução → Registro (o fluxo do CMMS). */
const STEPS: readonly FlowStep[] = [
  { label: 'Pedido',       status: 'REQUESTED',   date: (wo) => wo.createdAt },
  // A OS não guarda approvedAt: a etapa aparece só com o ✓.
  { label: 'Aprovação',    status: 'APPROVED',    date: () => null },
  { label: 'Planejamento', status: 'SCHEDULED',   date: (wo) => wo.scheduledStart, datePrefix: 'prev. ' },
  { label: 'Execução',     status: 'IN_PROGRESS', date: (wo) => wo.startedAt },
  { label: 'Registro',     status: 'COMPLETED',   date: (wo) => wo.completedAt },
]

const STAMP: Partial<Record<WorkOrderStatus, string>> = {
  REJECTED: 'Rejeitada',
  CANCELLED: 'Cancelada',
}

const DATE = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })

/** Até onde a OS chegou. Cancelada só deixa rastro nas datas que chegou a preencher. */
function reachedIndex(wo: WorkOrderDetail): number {
  const index = STEPS.findIndex((s) => s.status === wo.status)
  if (index >= 0) return index
  if (wo.status === 'REJECTED') return 0
  if (wo.startedAt) return 3
  if (wo.scheduledStart) return 2
  return 0
}

function stepStates(wo: WorkOrderDetail): readonly StepState[] {
  const reached = reachedIndex(wo)
  const terminal = wo.status === 'COMPLETED' || wo.status in STAMP
  return STEPS.map((_, i) => {
    if (i < reached || (i === reached && terminal)) return 'done'
    return i === reached ? 'current' : 'pending'
  })
}

interface WorkOrderFlowProps {
  readonly workOrder: WorkOrderDetail
}

export default function WorkOrderFlow({ workOrder: wo }: WorkOrderFlowProps) {
  const states = stepStates(wo)
  const stamp = STAMP[wo.status]
  const reason = wo.status === 'REJECTED' ? wo.rejectionReason : wo.cancellationReason

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <ol aria-label="Fluxo da ordem de serviço" className="grid grid-cols-1 gap-2 sm:grid-cols-5 sm:gap-1">
          {STEPS.map((step, i) => {
            const state = states[i]
            const date = step.date(wo)
            return (
              <li
                key={step.label}
                data-state={state}
                aria-current={state === 'current' ? 'step' : undefined}
                className={cn(
                  'flex gap-3 border-l-[3px] pl-3 sm:flex-col sm:gap-1 sm:border-l-0 sm:border-t-[3px] sm:pt-2 sm:pl-0',
                  state === 'done' && 'border-body',
                  state === 'current' && 'border-primary',
                  state === 'pending' && 'border-rule-strong',
                  stamp && state === 'pending' && 'opacity-40',
                )}
              >
                <span className="flex items-center gap-1.5">
                  <span className="font-mono text-[0.6875rem] text-faint">{String(i + 1).padStart(2, '0')}</span>
                  <span
                    className={cn(
                      'text-sm font-medium',
                      state === 'current' ? 'text-primary' : state === 'done' ? 'text-ink' : 'text-quiet',
                    )}
                  >
                    {step.label}
                  </span>
                  {state === 'done' && <Check className="size-3.5 text-success" aria-label="concluída" />}
                </span>
                <span className="font-mono text-xs tabular-nums text-quiet max-sm:ml-auto">
                  {date ? `${step.datePrefix ?? ''}${DATE.format(new Date(date))}` : ' '}
                </span>
              </li>
            )
          })}
        </ol>

        {stamp && (
          <span
            role="status"
            className="pointer-events-none absolute top-1/2 right-4 -translate-y-1/2 -rotate-3 border-2 border-error bg-sheet/90 px-3 py-1 font-mono text-sm font-semibold uppercase tracking-[0.2em] text-error"
          >
            {stamp}
          </span>
        )}
      </div>

      {stamp && reason && (
        <p className="border-l-[3px] border-error bg-error-soft px-3 py-2 text-sm text-body">
          <span className="font-medium text-error">Motivo: </span>
          {reason}
        </p>
      )}
    </div>
  )
}
