import { gql } from '@apollo/client'

export const GET_ROLES_MGMT = gql`
  query GetRolesMgmt {
    roles {
      id
      name
      description
      permissions
      isSystem
    }
  }
`
