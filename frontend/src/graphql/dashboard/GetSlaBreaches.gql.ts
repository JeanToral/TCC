import { gql } from '@apollo/client'

export const GET_SLA_BREACHES = gql`
  query GetSlaBreaches($filter: DashboardFilterInput) {
    slaBreaches(filter: $filter) {
      workOrderId
      title
      assetId
      assetTag
      assetName
      priority
      type
      createdAt
      startedAt
      completedAt
      limitHours
      delayHours
    }
  }
`
