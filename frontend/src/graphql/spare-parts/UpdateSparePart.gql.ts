import { gql } from '@apollo/client'

export const UPDATE_SPARE_PART = gql`
  mutation UpdateSparePart($id: Int!, $input: UpdateSparePartInput!) {
    updateSparePart(id: $id, input: $input) {
      id
      name
      partNumber
      description
      quantity
      minimumStock
      unitCost
    }
  }
`
