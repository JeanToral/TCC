import { gql } from '@apollo/client'

export const GET_PREVENTIVE_PLAN = gql`
  query GetPreventivePlan($id: Int!) {
    preventivePlan(id: $id) {
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
