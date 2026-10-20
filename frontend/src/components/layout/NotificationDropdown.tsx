import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery } from '@apollo/client/react'
import { Bell } from 'lucide-react'

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
import { cn } from '../../lib/utils'

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
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        className="relative flex size-9 items-center justify-center rounded-xs text-quiet hover:bg-subtle hover:text-ink"
        aria-label="Notificações"
        aria-expanded={isOpen}
        onClick={() => setIsOpen((o) => !o)}
      >
        <Bell className="size-[1.125rem]" aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="pointer-events-none absolute top-1 right-1 h-4 min-w-4 rounded-full bg-primary px-1 text-center font-mono text-[0.625rem] font-semibold leading-4 text-inverse"
            aria-label={`${unreadCount} não lidas`}
          >
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          className="z-50 overflow-hidden rounded-xs border border-rule bg-sheet shadow-lg max-sm:fixed max-sm:inset-x-4 max-sm:top-[calc(var(--topbar-height)+0.5rem)] sm:absolute sm:top-full sm:right-0 sm:mt-2 sm:w-[22rem]"
          role="dialog"
          aria-label="Notificações"
        >
          <div className="flex items-center justify-between border-b border-rule px-4 py-3">
            <span className="text-sm font-semibold text-ink">Notificações</span>
            {unreadCount > 0 && (
              <button
                type="button"
                className="text-xs text-primary hover:underline"
                onClick={() => void markAllRead()}
              >
                Marcar todas como lidas
              </button>
            )}
          </div>

          <ul className="max-h-80 overflow-y-auto [scrollbar-width:thin]" role="list">
            {loading && <li className="px-4 py-8 text-center text-sm text-quiet">Carregando…</li>}
            {!loading && notifications.length === 0 && (
              <li className="px-4 py-8 text-center text-sm text-quiet">Nenhuma notificação</li>
            )}
            {!loading && notifications.map((n) => (
              <li key={n.id} className="border-b border-rule last:border-b-0">
                <button
                  type="button"
                  className={cn(
                    'flex w-full items-start gap-2.5 px-4 py-3 text-left',
                    n.isRead ? 'hover:bg-subtle' : 'bg-primary/5 hover:bg-primary/10',
                  )}
                  onClick={() => handleNotificationClick(n)}
                >
                  <span
                    aria-hidden="true"
                    className={cn('mt-1.5 size-2 shrink-0', n.type === 'LOW_STOCK' ? 'bg-warning' : 'bg-primary')}
                  />
                  <span className="flex min-w-0 flex-col gap-1">
                    <span className="text-[0.8125rem] leading-snug text-ink">{n.message}</span>
                    <span className="text-[0.6875rem] text-quiet">{formatRelativeTime(n.createdAt)}</span>
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
