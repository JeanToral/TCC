import { gql } from '@apollo/client'

export const DELETE_PREVENTIVE_PLAN = gql`
  mutation DeletePreventivePlan($id: Int!) {
    deletePreventivePlan(id: $id) {
      id
    }
  }
`
