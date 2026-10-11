import { gql } from '@apollo/client'

export const GET_DASHBOARD_MONTHLY_TREND = gql`
  query GetDashboardMonthlyTrend($filter: DashboardFilterInput) {
    dashboardMonthlyTrend(filter: $filter) {
      month
      opened
      completed
      completedCorrective
      completedPreventive
      slaWithin
      slaTotal
      slaPercentage
    }
  }
`
