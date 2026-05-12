import { gql } from '@apollo/client'

export const REJECT_WORK_ORDER = gql`
  mutation RejectWorkOrder($id: Int!, $input: RejectWorkOrderInput!) {
    rejectWorkOrder(id: $id, input: $input) {
      id
      status
      rejectionReason
      updatedAt
    }
  }
`
