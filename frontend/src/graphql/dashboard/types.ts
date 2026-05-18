export interface AssetKpi {
  readonly assetId: number
  readonly assetName: string
  readonly mtbf: number | null
  readonly mttr: number | null
  readonly totalWorkOrders: number
  readonly completedWorkOrders: number
}

export interface SlaRate {
  readonly withinSla: number
  readonly total: number
  readonly percentage: number
}

export interface GetDashboardKpisData {
  readonly dashboardKpis: readonly AssetKpi[]
}

export interface GetDashboardSlaRateData {
  readonly dashboardSlaRate: SlaRate
}

export interface DashboardFilterInput {
  readonly assetId?: number
  readonly from?: string
  readonly to?: string
}
