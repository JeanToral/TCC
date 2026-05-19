import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'

import { BellIcon } from '../icons'
import { GET_NOTIFICATIONS } from '../../graphql/notifications/GetNotifications.gql'
import { GET_UNREAD_COUNT } from '../../graphql/notifications/GetUnreadCount.gql'
import { MARK_ALL_NOTIFICATIONS_READ } from '../../graphql/notifications/MarkAllNotificationsRead.gql'
import { MARK_NOTIFICATION_READ } from '../../graphql/notifications/MarkNotificationRead.gql'
import type {
  GetNotificationsData,
  GetUnreadCountData,
  MarkAllNotificationsReadData,
  MarkNotificationReadData,
  Notification,
} from '../../graphql/notifications/types'

const POLL_INTERVAL_MS = 30_000

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return 'agora'
  if (minutes < 60) return `${minutes}min atrás`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h atrás`
  return `${Math.floor(hours / 24)}d atrás`
}

export default function NotificationDropdown() {
  const navigate = useNavigate()
  const containerRef = useRef<HTMLDivElement>(null)
  const [isOpen, setIsOpen] = useState(false)

  const { data: countData, refetch: refetchCount } = useQuery<GetUnreadCountData>(
    GET_UNREAD_COUNT,
    { pollInterval: POLL_INTERVAL_MS, fetchPolicy: 'network-only' },
  )

  const { data: listData, loading, refetch: refetchList } = useQuery<GetNotificationsData>(
    GET_NOTIFICATIONS,
    { skip: !isOpen, fetchPolicy: 'network-only' },
  )

  const [markRead] = useMutation<MarkNotificationReadData>(MARK_NOTIFICATION_READ, {
    onCompleted: () => { void refetchCount(); void refetchList() },
  })

  const [markAllRead] = useMutation<MarkAllNotificationsReadData>(MARK_ALL_NOTIFICATIONS_READ, {
    onCompleted: () => { void refetchCount(); void refetchList() },
  })

  useEffect(() => {
    if (!isOpen) return
    void refetchList()
  }, [isOpen, refetchList])

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const unreadCount = countData?.unreadNotificationsCount ?? 0
  const notifications = listData?.notifications ?? []

  function handleNotificationClick(n: Notification) {
    if (!n.isRead) {
      void markRead({ variables: { id: n.id } })
    }
    if (n.type === 'OVERDUE_WORK_ORDER' && n.workOrderId != null) {
      navigate(`/dashboard/work-orders/${n.workOrderId}`)
    } else if (n.type === 'LOW_STOCK' && n.sparePartId != null) {
      navigate(`/dashboard/spare-parts/${n.sparePartId}/edit`)
    }
    setIsOpen(false)
  }

  return (
    <div className="notif-dropdown" ref={containerRef}>
      <button
        type="button"
        className="shell__topbar-btn notif-dropdown__trigger"
        aria-label="Notificações"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
      >
        <BellIcon />
        {unreadCount > 0 && (
          <span className="notif-dropdown__badge" aria-label={`${unreadCount} não lidas`}>
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notif-dropdown__panel" role="dialog" aria-label="Notificações">
          <div className="notif-dropdown__header">
            <span className="notif-dropdown__title">Notificações</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="notif-dropdown__mark-all"
                onClick={() => void markAllRead()}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ul className="notif-dropdown__list" role="list">
            {loading && (
              <li className="notif-dropdown__empty">Carregando...</li>
            )}
            {!loading && notifications.length === 0 && (
              <li className="notif-dropdown__empty">Nenhuma notificação</li>
            )}
            {!loading && notifications.map((n) => (
              <li key={n.id}>
                <button
                  type="button"
                  className={`notif-dropdown__item${n.isRead ? '' : ' notif-dropdown__item--unread'}`}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span
                    className={`notif-dropdown__dot${n.type === 'LOW_STOCK' ? ' notif-dropdown__dot--warn' : ' notif-dropdown__dot--danger'}`}
                  />
                  <span className="notif-dropdown__item-body">
                    <span className="notif-dropdown__item-msg">{n.message}</span>
                    <span className="notif-dropdown__item-time">{formatRelativeTime(n.createdAt)}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
