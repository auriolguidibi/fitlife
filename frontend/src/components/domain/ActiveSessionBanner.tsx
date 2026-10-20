import { NavLink, useLocation } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { useActivity } from '@/context/ActivityContext'
import { formatClock, formatKm } from '@/utils/format'

export function ActiveSessionBanner() {
  const { activity, status, elapsedSeconds, distanceKm } = useActivity()
  const { pathname } = useLocation()

  if (!activity || pathname.startsWith('/activity')) return null

  return (
    <NavLink
      to="/activity"
      className="fixed inset-x-3 bottom-[5.75rem] z-30 mx-auto flex max-w-lg items-center gap-3 rounded-2xl border border-fit/40 bg-fit/95 px-4 py-2.5 text-ink-900 shadow-fit backdrop-blur lg:inset-x-0 lg:bottom-4 lg:max-w-md"
    >
      <span className="relative grid h-9 w-9 place-items-center rounded-full bg-ink-900/20">
        <Radio size={18} className="animate-pulse" />
      </span>
      <div className="flex-1 text-xs">
        <p className="font-bold">
          {status === 'paused' ? 'Session en pause' : 'Session en cours'} · {formatClock(elapsedSeconds)}
        </p>
        <p className="opacity-70">{formatKm(distanceKm)} · Touche pour revenir</p>
      </div>
      <span className="rounded-full bg-ink-900 px-3 py-1.5 text-xs font-bold text-fit">Ouvrir</span>
    </NavLink>
  )
}
