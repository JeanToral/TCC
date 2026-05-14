import { gql } from '@apollo/client'

export const GET_ASSET = gql`
  query GetAsset($id: Int!) {
    asset(id: $id) {
      id
      name
      tag
      location
      manufacturer
      model
      serialNumber
      installDate
      createdAt
      updatedAt
      deletedAt
    }
  }
`
