import { gql } from '@apollo/client'

export const UPDATE_WORK_ORDER_EXTERNAL_COST = gql`
  mutation UpdateWorkOrderExternalCost($id: Int!, $input: UpdateExternalCostInput!) {
    updateWorkOrderExternalCost(id: $id, input: $input) {
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
