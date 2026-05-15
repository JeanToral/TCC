import { gql } from '@apollo/client'

export const GET_WORK_ORDERS = gql`
  query GetWorkOrders($filter: WorkOrdersFilterInput, $first: Int, $after: String) {
    workOrders(filter: $filter, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          title
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
          createdAt
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
