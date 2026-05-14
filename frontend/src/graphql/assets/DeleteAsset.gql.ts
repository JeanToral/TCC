import { gql } from '@apollo/client'

export const DELETE_ASSET = gql`
  mutation DeleteAsset($id: Int!) {
    deleteAsset(id: $id) {
      id
      name
    }
  }
`
