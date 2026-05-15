import { gql } from '@apollo/client'

export const UPDATE_ROLE = gql`
  mutation UpdateRole($id: Int!, $input: UpdateRoleInput!) {
    updateRole(id: $id, input: $input) {
      id
      name
      description
      permissions
      isSystem
    }
  }
`
