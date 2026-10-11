import type { WorkOrderStatus } from '../work-orders/types'

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

export interface StatusCount {
  readonly status: WorkOrderStatus
  readonly count: number
}

export interface MonthlyTrendPoint {
  /** `YYYY-MM`, no fuso da planta. */
  readonly month: string
  readonly opened: number
  readonly completed: number
  readonly completedCorrective: number
  readonly completedPreventive: number
  readonly slaWithin: number
  readonly slaTotal: number
  /** null quando o mês não teve OS concluída com início registrado. */
  readonly slaPercentage: number | null
}

export interface GetDashboardStatusCountsData {
  readonly dashboardStatusCounts: readonly StatusCount[]
}

export interface GetDashboardMonthlyTrendData {
  readonly dashboardMonthlyTrend: readonly MonthlyTrendPoint[]
}
