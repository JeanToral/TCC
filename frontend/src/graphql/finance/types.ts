export interface AssetCost {
  readonly assetId: number
  readonly assetName: string
  readonly assetTag: string

  /** Custo Realizado — OS concluídas, valores congelados. */
  readonly realizedPartsCost: number
  readonly realizedLaborCost: number
  readonly realizedExternalCost: number
  readonly realizedTotal: number

  /** Mesmo realizado, quebrado por tipo de manutenção. */
  readonly realizedCorrectiveCost: number
  readonly realizedPreventiveCost: number

  /** Custo Previsto — OS abertas, preços atuais. Estimativa. */
  readonly forecastTotal: number

  readonly completedWorkOrders: number
  readonly workOrdersWithIncompleteCost: number
}

export interface FinanceFilterInput {
  readonly assetId?: number
  readonly from?: string
  readonly to?: string
}

export interface GetAssetCostsData {
  readonly assetCosts: readonly AssetCost[]
}
