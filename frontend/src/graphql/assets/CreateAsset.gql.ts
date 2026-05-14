import { gql } from '@apollo/client'

export const CREATE_ASSET = gql`
  mutation CreateAsset($input: CreateAssetInput!) {
    createAsset(input: $input) {
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
    }
  }
`
