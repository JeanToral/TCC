import { gql } from '@apollo/client'

export const COMPLETE_WORK_ORDER = gql`
  mutation CompleteWorkOrder($id: Int!, $input: CompleteWorkOrderInput!) {
    completeWorkOrder(id: $id, input: $input) {
      id
      status
      closingNotes
      completedAt
      updatedAt
    }
  }
`
