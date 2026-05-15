import { gql } from '@apollo/client'

export const DELETE_ROLE = gql`
  mutation DeleteRole($id: Int!) {
    deleteRole(id: $id) {
      id
      name
    }
  }
`
