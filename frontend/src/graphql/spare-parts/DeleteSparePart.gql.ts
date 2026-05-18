import { gql } from '@apollo/client'

export const DELETE_SPARE_PART = gql`
  mutation DeleteSparePart($id: Int!) {
    deleteSparePart(id: $id) {
      id
    }
  }
`
