import { DownloadAppButton } from '@/components/domain/DownloadApp'
import { NavLink } from 'react-router-dom'
import { Crown } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { useUnreadNotifications } from '@/hooks/useNotifications'
import { Avatar } from '@/components/ui'
import { Logo } from './Logo'
import { NotificationBell } from '@/components/domain/NotificationCenter'

export function MobileHeader() {
  const { user } = useAuth()
  const unread = useUnreadNotifications()

  return (
    <header className="sticky top-0 z-30 border-b border-white/[0.06] bg-ink-900/70 backdrop-blur-2xl lg:hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <Logo size="sm" />
        <div className="flex items-center gap-2">
          {!user?.isPremium && user?.role === 'user' && (
            <NavLink
              to="/premium"
              className="inline-flex h-9 items-center gap-1.5 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 text-[11px] font-bold text-amber-300"
            >
              <Crown size={13} /> Premium
            </NavLink>
          )}
          <DownloadAppButton variant="icon" />
          <NotificationBell unread={unread} />
          <NavLink to="/profile">
            <Avatar
              name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`}
              src={user?.avatarUrl}
              size="sm"
              ring
            />
          </NavLink>
        </div>
      </div>
    </header>
  )
}
