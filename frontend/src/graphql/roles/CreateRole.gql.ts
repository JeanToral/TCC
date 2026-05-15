import { gql } from '@apollo/client'

export const CREATE_ROLE = gql`
  mutation CreateRole($input: CreateRoleInput!) {
    createRole(input: $input) {
      id
      name
      description
      permissions
      isSystem
    }
  }
`
