import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, CheckCheck, ChevronLeft, ChevronRight, X } from 'lucide-react'
import type { Notification } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { notifyNotificationsChanged } from '@/hooks/useNotifications'
import { Spinner, fallbackNotificationIcon, notificationIcons } from '@/components/ui'
import { relativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

type Filter = 'all' | 'unread' | 'live' | 'news'

/** Nombre de notifications par page : la liste tient sur un écran, sans défilement. */
const PAGE_SIZE = 5

const routeFor: Partial<Record<Notification['type'], string>> = {
  live: '/lives',
  event: '/events',
  announcement: '/',
  workout: '/program',
  hydration: '/hydration',
  meal: '/nutrition',
  leaderboard: '/leaderboard',
  badge: '/badges',
  challenge: '/challenges',
}

const filters: { value: Filter; label: string; match: (n: Notification) => boolean }[] = [
  { value: 'all', label: 'Toutes', match: () => true },
  { value: 'unread', label: 'Non lues', match: (n) => !n.read },
  { value: 'live', label: 'Lives', match: (n) => n.type === 'live' },
  { value: 'news', label: 'Annonces', match: (n) => n.type === 'announcement' || n.type === 'event' },
]

/** Liste paginée des notifications (utilisée par le panneau et par la page). */
export function NotificationList({ onNavigate }: { onNavigate?: () => void }) {
  const navigate = useNavigate()
  const { data, loading, setData } = useAsync(() => api.getNotifications(), [])
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(0)

  useEffect(() => setPage(0), [filter])

  if (loading || !data) return <Spinner label="Chargement des notifications…" />

  const unread = data.filter((n) => !n.read).length
  const list = data.filter(filters.find((f) => f.value === filter)!.match)
  const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE))
  const current = Math.min(page, pages - 1)
  const visible = list.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE)

  const open = async (n: Notification) => {
    if (!n.read) {
      setData(data.map((x) => (x.id === n.id ? { ...x, read: true } : x)))
      await api.markNotificationRead(n.id).catch(() => undefined)
      notifyNotificationsChanged()
    }
    const to = n.title.startsWith('Nouvelle inscription') ? '/super-admin' : routeFor[n.type]
    if (to) {
      onNavigate?.()
      navigate(to)
    }
  }

  const markAll = async () => {
    setData(data.map((x) => ({ ...x, read: true })))
    await api.markAllNotificationsRead().catch(() => undefined)
    notifyNotificationsChanged()
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-white/50">{unread > 0 ? `${unread} non lue${unread > 1 ? 's' : ''}` : 'Tout est à jour'}</p>
        {unread > 0 && (
          <button onClick={markAll} className="inline-flex items-center gap-1 text-xs font-semibold text-fit">
            <CheckCheck size={14} /> Tout marquer comme lu
          </button>
        )}
      </div>

      <div className="grid grid-cols-4 gap-1 rounded-2xl border border-white/[0.06] bg-ink-800/80 p-1">
        {filters.map((f) => {
          const count = data.filter(f.match).length
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={cn(
                'truncate rounded-xl px-1.5 py-2 text-[11px] font-semibold transition sm:text-xs',
                filter === f.value ? 'bg-fit text-white' : 'text-white/55 hover:text-white',
              )}
            >
              {f.label}
              {f.value !== 'all' && count > 0 && <span className="ml-1 opacity-70">{count}</span>}
            </button>
          )
        })}
      </div>

      <div className="space-y-2">
        {visible.length === 0 && (
          <div className="rounded-2xl border border-white/[0.06] bg-ink-800/50 px-4 py-8 text-center text-sm text-white/45">
            {filter === 'unread' ? 'Aucune notification non lue.' : 'Aucune notification pour le moment.'}
          </div>
        )}
        {visible.map((n) => {
          const { icon: Icon, tone } = notificationIcons[n.type] ?? fallbackNotificationIcon
          return (
            <button
              key={n.id}
              onClick={() => open(n)}
              className={cn(
                'flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 text-left transition',
                n.read ? 'border-white/5 bg-ink-800/40' : 'border-fit/25 bg-ink-700 hover:border-fit/50',
              )}
            >
              <span className={cn('grid h-9 w-9 shrink-0 place-items-center rounded-xl', tone, n.read && 'opacity-60')}>
                <Icon size={16} />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm font-bold', n.read ? 'text-white/60' : 'text-white')}>{n.title}</span>
                <span className="block truncate text-xs text-white/50">{n.body}</span>
              </span>
              <span className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-[10px] text-white/35">{relativeTime(n.createdAt)}</span>
                {!n.read && <span className="h-2 w-2 rounded-full bg-fit" />}
              </span>
            </button>
          )
        })}
      </div>

      {pages > 1 && (
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => setPage(current - 1)}
            disabled={current === 0}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/70 transition hover:text-white disabled:opacity-30"
            aria-label="Page précédente"
          >
            <ChevronLeft size={16} />
          </button>
          <div className="flex items-center gap-1.5">
            {Array.from({ length: pages }, (_, i) => (
              <button
                key={i}
                onClick={() => setPage(i)}
                aria-label={`Page ${i + 1}`}
                className={cn('h-2 rounded-full transition-all', i === current ? 'w-6 bg-fit' : 'w-2 bg-white/20 hover:bg-white/40')}
              />
            ))}
          </div>
          <button
            onClick={() => setPage(current + 1)}
            disabled={current >= pages - 1}
            className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 text-white/70 transition hover:text-white disabled:opacity-30"
            aria-label="Page suivante"
          >
            <ChevronRight size={16} />
          </button>
        </div>
      )}
    </div>
  )
}

/** Panneau de notifications qui s'ouvre par-dessus la page en cours. */
export function NotificationPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null
  return (
    <div className="fixed inset-0 z-[60]" role="dialog" aria-modal="true" aria-label="Notifications">
      <button className="absolute inset-0 bg-ink-900/70 backdrop-blur-sm" onClick={onClose} aria-label="Fermer" />
      <div className="absolute inset-x-3 top-3 mx-auto max-w-md animate-slide-up rounded-3xl border border-white/10 bg-ink-800/95 p-4 shadow-card backdrop-blur-xl lg:left-auto lg:right-6 lg:top-6 lg:mx-0 lg:w-[26rem]">
        <div className="mb-3 flex items-center gap-2">
          <span className="grid h-9 w-9 place-items-center rounded-xl bg-fit/15 text-fit">
            <Bell size={17} />
          </span>
          <h2 className="flex-1 font-display text-lg font-bold text-white">Notifications</h2>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/5 hover:text-white" aria-label="Fermer">
            <X size={18} />
          </button>
        </div>
        <NotificationList onNavigate={onClose} />
      </div>
    </div>
  )
}

/** Cloche avec pastille : ouvre le panneau sur la page en cours. */
export function NotificationBell({ unread, className }: { unread: number; className?: string }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ''}`}
        className={cn(
          'relative grid h-10 w-10 place-items-center rounded-full border border-white/[0.06] bg-ink-700/80 text-white/70 transition hover:text-white',
          className,
        )}
      >
        <Bell size={18} />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-[18px] min-w-[18px] place-items-center rounded-full border-2 border-ink-900 bg-fit px-1 text-[9px] font-bold text-white">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>
      <NotificationPanel open={open} onClose={() => setOpen(false)} />
    </>
  )
}
