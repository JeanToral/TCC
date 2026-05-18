import { gql } from '@apollo/client'

export const CREATE_SPARE_PART = gql`
  mutation CreateSparePart($input: CreateSparePartInput!) {
    createSparePart(input: $input) {
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
