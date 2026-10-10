export interface WorkOrderExternalCost {
  readonly id: number
  readonly workOrderId: number
  readonly description: string
  readonly supplier: string | null
  readonly amount: number
  /** Competência: mês ao qual o custo pertence economicamente. */
  readonly incurredAt: string
  readonly createdById: number
  readonly createdAt: string
  readonly updatedAt: string
}

export interface WorkOrderCostBreakdown {
  readonly partsCost: number
  readonly laborCost: number
  readonly externalCost: number
  readonly total: number
  /** false quando faltou preço de peça ou taxa horária. */
  readonly isComplete: boolean
}

export interface WorkOrderPartItem {
  readonly id: number
  readonly sparePartId: number
  readonly quantityUsed: number
  /** null sem a permissão cost.read, ou enquanto a OS não concluiu. */
  readonly unitCostSnapshot: number | null
  readonly sparePart: {
    readonly id: number
    readonly name: string
    readonly partNumber: string
  }
}

export interface GetWorkOrderPartsData {
  readonly workOrderParts: readonly WorkOrderPartItem[]
}

export interface AddWorkOrderExternalCostData {
  readonly addWorkOrderExternalCost: WorkOrderExternalCost
}

export interface UpdateWorkOrderExternalCostData {
  readonly updateWorkOrderExternalCost: WorkOrderExternalCost
}

export interface RemoveWorkOrderExternalCostData {
  readonly removeWorkOrderExternalCost: boolean
}

export interface ExternalCostFormValues {
  readonly description: string
  readonly supplier: string
  readonly amount: string
  readonly incurredAt: string
}
