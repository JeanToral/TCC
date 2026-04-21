import { gql } from '@apollo/client'

export const REMOVE_USER = gql`
  mutation RemoveUser($id: Int!) {
    removeUser(id: $id) {
      id
    }
  }
`
