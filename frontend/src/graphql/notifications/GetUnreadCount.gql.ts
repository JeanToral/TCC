import { gql } from '@apollo/client'

export const GET_UNREAD_COUNT = gql`
  query GetUnreadNotificationsCount {
    unreadNotificationsCount
  }
`
