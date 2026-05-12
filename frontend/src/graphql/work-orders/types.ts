export type WorkOrderType = 'CORRECTIVE' | 'PREVENTIVE'
export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
export type WorkOrderStatus =
  | 'REQUESTED'
  | 'APPROVED'
  | 'REJECTED'
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export interface AssetBasic {
  readonly id: number
  readonly name: string
  readonly tag: string
  readonly location: string | null
}

export interface UserBasic {
  readonly id: number
  readonly name: string
  readonly email: string
}

export interface WorkOrderListItem {
  readonly id: number
  readonly title: string
  readonly type: WorkOrderType
  readonly priority: Priority
  readonly status: WorkOrderStatus
  readonly assetId: number
  readonly asset: AssetBasic
  readonly requestedById: number
  readonly requestedBy: UserBasic
  readonly assignedToId: number | null
  readonly assignedTo: UserBasic | null
  readonly scheduledStart: string | null
  readonly createdAt: string
}

export interface WorkOrderDetail extends WorkOrderListItem {
  readonly description: string
  readonly scheduledEnd: string | null
  readonly rejectionReason: string | null
  readonly closingNotes: string | null
  readonly startedAt: string | null
  readonly completedAt: string | null
  readonly updatedAt: string
  readonly deletedAt: string | null
}

export interface GetWorkOrdersData {
  readonly workOrders: readonly WorkOrderListItem[]
}

export interface GetWorkOrderData {
  readonly workOrder: WorkOrderDetail
}

export interface CreateWorkOrderData {
  readonly createWorkOrder: WorkOrderDetail
}

export interface ApproveWorkOrderData {
  readonly approveWorkOrder: WorkOrderDetail
}

export interface RejectWorkOrderData {
  readonly rejectWorkOrder: WorkOrderDetail
}

export interface ScheduleWorkOrderData {
  readonly scheduleWorkOrder: WorkOrderDetail
}
