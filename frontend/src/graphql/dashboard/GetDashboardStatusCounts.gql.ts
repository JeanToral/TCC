import { gql } from '@apollo/client'

export const GET_DASHBOARD_STATUS_COUNTS = gql`
  query GetDashboardStatusCounts($filter: DashboardFilterInput) {
    dashboardStatusCounts(filter: $filter) {
      status
      count
    }
  }
`
