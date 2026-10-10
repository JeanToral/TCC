import { gql } from '@apollo/client'

export const GET_ASSET_COSTS = gql`
  query GetAssetCosts($filter: FinanceFilterInput) {
    assetCosts(filter: $filter) {
      assetId
      assetName
      assetTag
      realizedPartsCost
      realizedLaborCost
      realizedExternalCost
      realizedTotal
      realizedCorrectiveCost
      realizedPreventiveCost
      forecastTotal
      completedWorkOrders
      workOrdersWithIncompleteCost
    }
  }
`
