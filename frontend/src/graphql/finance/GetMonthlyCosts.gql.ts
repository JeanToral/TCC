import { gql } from '@apollo/client'

export const GET_MONTHLY_COSTS = gql`
  query GetMonthlyCosts($filter: FinanceFilterInput) {
    monthlyCosts(filter: $filter) {
      month
      corrective
      preventive
      total
      workOrdersWithIncompleteCost
    }
  }
`
