import { gql } from '@apollo/client'

export const MARK_NOTIFICATION_READ = gql`
  mutation MarkNotificationRead($id: Int!) {
    markNotificationRead(id: $id) {
      id
      isRead
    }
  }
`
