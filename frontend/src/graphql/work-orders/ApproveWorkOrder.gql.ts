import { gql } from '@apollo/client'

export const APPROVE_WORK_ORDER = gql`
  mutation ApproveWorkOrder($id: Int!) {
    approveWorkOrder(id: $id) {
      id
      status
      updatedAt
    }
  }
`
