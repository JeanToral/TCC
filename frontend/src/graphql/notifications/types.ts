export type NotificationKind = 'OVERDUE_WORK_ORDER' | 'LOW_STOCK'

export interface Notification {
  readonly id: number
  readonly type: NotificationKind
  readonly message: string
  readonly isRead: boolean
  readonly userId: number
  readonly workOrderId: number | null
  readonly sparePartId: number | null
  readonly createdAt: string
}

export interface GetNotificationsData {
  readonly notifications: readonly Notification[]
}

export interface GetUnreadCountData {
  readonly unreadNotificationsCount: number
}

export interface MarkNotificationReadData {
  readonly markNotificationRead: Notification
}

export interface MarkAllNotificationsReadData {
  readonly markAllNotificationsRead: boolean
}
