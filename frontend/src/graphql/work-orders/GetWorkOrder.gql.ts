import { gql } from '@apollo/client'

export const GET_WORK_ORDER = gql`
  query GetWorkOrder($id: Int!) {
    workOrder(id: $id) {
      id
      title
      description
      type
      priority
      status
      assetId
      asset { id name tag location }
      requestedById
      requestedBy { id name email }
      assignedToId
      assignedTo { id name email }
      scheduledStart
      scheduledEnd
      rejectionReason
      closingNotes
      cancellationReason
      startedAt
      completedAt
      laborHours
      costIsComplete
      cost {
        partsCost
        laborCost
        externalCost
        total
        isComplete
      }
      externalCosts {
        id
        workOrderId
        description
        supplier
        amount
        incurredAt
        createdById
        createdAt
        updatedAt
      }
      createdAt
      updatedAt
      deletedAt
    }
  }
`
