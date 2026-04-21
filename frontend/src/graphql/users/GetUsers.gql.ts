import { gql } from '@apollo/client'

export const GET_USERS = gql`
  query GetUsers {
    users {
      id
      name
      email
      isActive
      roleId
      role {
        id
        name
      }
      createdAt
    }
  }
`
