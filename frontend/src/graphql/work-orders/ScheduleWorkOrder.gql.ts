import { gql } from '@apollo/client'

export const SCHEDULE_WORK_ORDER = gql`
  mutation ScheduleWorkOrder($id: Int!, $input: ScheduleWorkOrderInput!) {
    scheduleWorkOrder(id: $id, input: $input) {
      id
      status
      assignedToId
      assignedTo { id name email }
      scheduledStart
      scheduledEnd
      updatedAt
    }
  }
`
