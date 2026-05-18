import { gql } from '@apollo/client'

export const UPDATE_PREVENTIVE_PLAN = gql`
  mutation UpdatePreventivePlan($id: Int!, $input: UpdatePreventivePlanInput!) {
    updatePreventivePlan(id: $id, input: $input) {
      id
      name
      assetId
      intervalDays
      nextDueAt
      isActive
    }
  }
`
