import { gql } from '@apollo/client'

export const LOGIN = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
    }
  }
`

export interface LoginMutationVariables {
  input: {
    email: string
    password: string
  }
}

export interface LoginMutationResult {
  login: {
    accessToken: string
  }
}
