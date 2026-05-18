import { gql } from '@apollo/client'

export const ADD_WORK_ORDER_PART = gql`
  mutation AddWorkOrderPart($input: AddWorkOrderPartInput!) {
    addWorkOrderPart(input: $input) {
      id
      workOrderId
      sparePartId
      sparePart {
        id
        name
        partNumber
      }
      quantityUsed
      createdAt
    }
  }
`

export const GET_WORK_ORDER_PARTS = gql`
  query GetWorkOrderParts($workOrderId: Int!) {
    workOrderParts(workOrderId: $workOrderId) {
      id
      workOrderId
      sparePartId
      sparePart {
        id
        name
        partNumber
      }
      quantityUsed
      createdAt
    }
  }
`

export const REMOVE_WORK_ORDER_PART = gql`
  mutation RemoveWorkOrderPart($workOrderId: Int!, $sparePartId: Int!) {
    removeWorkOrderPart(workOrderId: $workOrderId, sparePartId: $sparePartId)
  }
`
