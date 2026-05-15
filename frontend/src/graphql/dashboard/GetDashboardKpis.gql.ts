import { gql } from '@apollo/client'

export const GET_DASHBOARD_KPIS = gql`
  query GetDashboardKpis($filter: DashboardFilterInput) {
    dashboardKpis(filter: $filter) {
      assetId
      assetName
      mtbf
      mttr
      totalWorkOrders
      completedWorkOrders
    }
  }
`
