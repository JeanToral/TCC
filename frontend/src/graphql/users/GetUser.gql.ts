import { gql } from '@apollo/client'

export const GET_USER = gql`
  query GetUser($id: Int!) {
    user(id: $id) {
      id
      name
      email
      isActive
      roleId
      role {
        id
        name
        description
        permissions
        isSystem
      }
      createdAt
      updatedAt
      deletedAt
    }
  }
`
