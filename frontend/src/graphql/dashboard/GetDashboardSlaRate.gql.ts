import { gql } from '@apollo/client'

export const GET_DASHBOARD_SLA_RATE = gql`
  query GetDashboardSlaRate($filter: DashboardFilterInput) {
    dashboardSlaRate(filter: $filter) {
      withinSla
      total
      percentage
    }
  }
`
