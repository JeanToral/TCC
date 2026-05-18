import { gql } from '@apollo/client'

export const GENERATE_DUE_PREVENTIVE_WORK_ORDERS = gql`
  mutation GenerateDuePreventiveWorkOrders {
    generateDuePreventiveWorkOrders
  }
`
