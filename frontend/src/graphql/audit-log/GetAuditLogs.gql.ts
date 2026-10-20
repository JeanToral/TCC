import { gql } from '@apollo/client'

export const GET_AUDIT_LOGS = gql`
  query GetAuditLogs($targetType: String, $first: Int, $after: String) {
    auditLogs(targetType: $targetType, first: $first, after: $after) {
      edges {
        cursor
        node {
          id
          action
          targetType
          targetId
          before
          after
          createdAt
          user {
            id
            name
            email
          }
        }
      }
      pageInfo {
        hasNextPage
        endCursor
      }
    }
  }
`
