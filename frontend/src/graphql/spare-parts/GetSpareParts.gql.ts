import { gql } from '@apollo/client'

export const GET_SPARE_PARTS = gql`
  query GetSpareParts($search: String) {
    spareParts(search: $search) {
      id
      name
      partNumber
      description
      quantity
      minimumStock
      unitCost
      updatedAt
    }
  }
`
