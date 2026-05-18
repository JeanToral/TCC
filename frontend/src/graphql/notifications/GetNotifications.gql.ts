import { gql } from '@apollo/client'

export const GET_NOTIFICATIONS = gql`
  query GetNotifications($unreadOnly: Boolean) {
    notifications(unreadOnly: $unreadOnly) {
      id
      type
      message
      isRead
      workOrderId
      sparePartId
      createdAt
    }
  }
`
