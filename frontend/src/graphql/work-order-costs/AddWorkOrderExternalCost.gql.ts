import { gql } from '@apollo/client'

export const ADD_WORK_ORDER_EXTERNAL_COST = gql`
  mutation AddWorkOrderExternalCost($input: AddExternalCostInput!) {
    addWorkOrderExternalCost(input: $input) {
      id
      workOrderId
      description
      supplier
      amount
      incurredAt
      createdById
      createdAt
      updatedAt
    }
  }
`
