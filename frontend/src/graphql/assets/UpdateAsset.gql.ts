import { gql } from '@apollo/client'

export const UPDATE_ASSET = gql`
  mutation UpdateAsset($id: Int!, $input: UpdateAssetInput!) {
    updateAsset(id: $id, input: $input) {
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
