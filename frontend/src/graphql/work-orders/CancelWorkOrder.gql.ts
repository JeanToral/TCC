import { gql } from '@apollo/client'

export const CANCEL_WORK_ORDER = gql`
  mutation CancelWorkOrder($id: Int!, $input: CancelWorkOrderInput!) {
    cancelWorkOrder(id: $id, input: $input) {
      id
      status
      cancellationReason
      updatedAt
    }
  }
`
