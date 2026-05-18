import { gql } from '@apollo/client'

export const CREATE_PREVENTIVE_PLAN = gql`
  mutation CreatePreventivePlan($input: CreatePreventivePlanInput!) {
    createPreventivePlan(input: $input) {
      id
      name
      assetId
      intervalDays
      nextDueAt
      isActive
    }
  }
`
