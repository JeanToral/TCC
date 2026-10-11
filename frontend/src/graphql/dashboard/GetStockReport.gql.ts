import { gql } from '@apollo/client'

export const GET_STOCK_REPORT = gql`
  query GetStockReport($filter: DashboardFilterInput) {
    stockReport(filter: $filter) {
      sparePartId
      partNumber
      name
      quantity
      minimumStock
      belowMinimum
      consumed
      workOrders
    }
  }
`
