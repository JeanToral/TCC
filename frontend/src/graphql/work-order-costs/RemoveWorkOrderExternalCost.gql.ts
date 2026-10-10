import { gql } from '@apollo/client'

export const REMOVE_WORK_ORDER_EXTERNAL_COST = gql`
  mutation RemoveWorkOrderExternalCost($id: Int!) {
    removeWorkOrderExternalCost(id: $id)
  }
`
