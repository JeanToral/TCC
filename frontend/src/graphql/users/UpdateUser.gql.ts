import { gql } from '@apollo/client'

export const UPDATE_USER = gql`
  mutation UpdateUser($id: Int!, $input: UpdateUserInput!) {
    updateUser(id: $id, input: $input) {
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
      updatedAt
    }
  }
`
