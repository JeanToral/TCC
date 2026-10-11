import { gql } from '@apollo/client'

export const UPDATE_MY_PROFILE = gql`
  mutation UpdateMyProfile($input: UpdateMyProfileInput!) {
    updateMyProfile(input: $input) {
      id
      name
      email
      role {
        id
        name
      }
    }
  }
`
