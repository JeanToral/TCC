import { gql } from '@apollo/client'

export const GET_ASSETS = gql`
  query GetAssets {
    assets {
      id
      name
      tag
      location
    }
  }
`
