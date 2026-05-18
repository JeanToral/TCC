import { gql } from '@apollo/client'

export const GET_SPARE_PART = gql`
  query GetSparePart($id: Int!) {
    sparePart(id: $id) {
      id
      name
      partNumber
      description
      quantity
      minimumStock
      unitCost
      createdAt
      updatedAt
    }
  }
`
