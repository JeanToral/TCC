import { gql } from '@apollo/client'

export const CREATE_WORK_ORDER = gql`
  mutation CreateWorkOrder($input: CreateWorkOrderInput!) {
    createWorkOrder(input: $input) {
      id
      title
      status
      priority
      type
      asset { id name tag }
      createdAt
    }
  }
`
