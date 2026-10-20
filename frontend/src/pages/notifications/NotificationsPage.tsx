import { Bell } from 'lucide-react'
import { Card } from '@/components/ui'
import { NotificationList } from '@/components/domain/NotificationCenter'

/** Page Notifications : liste compacte et paginée, tout tient sur un seul écran. */
export function NotificationsPage() {
  return (
    <div className="mx-auto max-w-xl space-y-4 animate-fade-in">
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fit/15 text-fit">
          <Bell size={20} />
        </span>
        <div>
          <h1 className="font-display text-2xl font-extrabold text-white">Notifications</h1>
          <p className="text-xs text-white/50">Lives, annonces, rappels et défis au même endroit.</p>
        </div>
      </div>
      <Card>
        <NotificationList />
      </Card>
    </div>
  )
}
