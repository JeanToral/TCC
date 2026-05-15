import { gql } from '@apollo/client'

export const GET_ROLE = gql`
  query GetRole($id: Int!) {
    role(id: $id) {
      id
      name
      description
      permissions
      isSystem
    }
  }
`
