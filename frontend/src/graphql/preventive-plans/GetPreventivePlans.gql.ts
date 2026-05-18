import { gql } from '@apollo/client'

export const GET_PREVENTIVE_PLANS = gql`
  query GetPreventivePlans($assetId: Int) {
    preventivePlans(assetId: $assetId) {
      id
      name
      description
      assetId
      asset { id name tag }
      intervalDays
      lastGeneratedAt
      nextDueAt
      isActive
    }
  }
`
