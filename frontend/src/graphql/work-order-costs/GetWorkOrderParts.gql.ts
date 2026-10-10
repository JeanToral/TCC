import { gql } from '@apollo/client'

export const GET_WORK_ORDER_PARTS = gql`
  query GetWorkOrderParts($workOrderId: Int!) {
    workOrderParts(workOrderId: $workOrderId) {
      id
      sparePartId
      quantityUsed
      unitCostSnapshot
      sparePart {
        id
        name
        partNumber
      }
    }
  }
`
