export interface PreventivePlan {
  readonly id: number
  readonly name: string
  readonly description: string | null
  readonly assetId: number
  readonly asset?: { readonly id: number; readonly name: string; readonly tag: string }
  readonly intervalDays: number
  readonly lastGeneratedAt: string | null
  readonly nextDueAt: string
  readonly isActive: boolean
  readonly createdAt: string
  readonly updatedAt: string
}

export interface GetPreventivePlansData {
  readonly preventivePlans: readonly PreventivePlan[]
}

export interface GetPreventivePlanData {
  readonly preventivePlan: PreventivePlan
}

export interface CreatePreventivePlanData {
  readonly createPreventivePlan: PreventivePlan
}

export interface UpdatePreventivePlanData {
  readonly updatePreventivePlan: PreventivePlan
}

export interface DeletePreventivePlanData {
  readonly deletePreventivePlan: PreventivePlan
}

export interface GenerateDuePreventiveWorkOrdersData {
  readonly generateDuePreventiveWorkOrders: number
}
