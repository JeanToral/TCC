import type { BadgeVariant } from '../components/ui/Badge'
import type { Priority, WorkOrderStatus, WorkOrderType } from '../graphql/work-orders/types'

export const WORK_ORDER_STATUS_LABELS: Record<WorkOrderStatus, string> = {
  REQUESTED: 'Solicitada',
  APPROVED: 'Aprovada',
  REJECTED: 'Rejeitada',
  SCHEDULED: 'Agendada',
  IN_PROGRESS: 'Em andamento',
  COMPLETED: 'Concluída',
  CANCELLED: 'Cancelada',
}

export const WORK_ORDER_STATUS_VARIANT: Record<WorkOrderStatus, BadgeVariant> = {
  REQUESTED: 'info',
  APPROVED: 'success',
  REJECTED: 'error',
  SCHEDULED: 'warning',
  IN_PROGRESS: 'warning',
  COMPLETED: 'success',
  CANCELLED: 'default',
}

export const PRIORITY_LABELS: Record<Priority, string> = {
  LOW: 'Baixa',
  MEDIUM: 'Média',
  HIGH: 'Alta',
  CRITICAL: 'Crítica',
}

/** Barras acesas no marcador de prioridade; CRITICAL vira carimbo. */
export const PRIORITY_LEVEL: Record<Exclude<Priority, 'CRITICAL'>, 1 | 2 | 3> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
}

export const WORK_ORDER_TYPE_LABELS: Record<WorkOrderType, string> = {
  CORRECTIVE: 'Corretiva',
  PREVENTIVE: 'Preventiva',
}

/** 41 → "OS-0041": como a OS é chamada no chão de fábrica. */
export function formatWorkOrderCode(id: number): string {
  return `OS-${String(id).padStart(4, '0')}`
}
