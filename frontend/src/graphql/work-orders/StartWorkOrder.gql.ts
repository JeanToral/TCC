import { gql } from '@apollo/client'

export const START_WORK_ORDER = gql`
  mutation StartWorkOrder($id: Int!) {
    startWorkOrder(id: $id) {
      id
      status
      startedAt
      updatedAt
    }
  }
`
