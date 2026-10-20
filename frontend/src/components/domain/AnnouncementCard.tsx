import { AlertTriangle, Info, Megaphone, Pin } from 'lucide-react'
import type { Announcement } from '@/types'
import { Avatar } from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { announcementPriorityLabels } from '@/utils/labels'
import { relativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

const styles = {
  info: { box: 'border-sky-400/20 bg-sky-400/[0.06]', chip: 'bg-sky-400/15 text-sky-300', icon: Info },
  important: { box: 'border-fit/30 bg-fit/[0.07]', chip: 'bg-fit/15 text-fit', icon: Megaphone },
  urgent: { box: 'border-red-400/30 bg-red-500/[0.08]', chip: 'bg-red-400/15 text-red-300', icon: AlertTriangle },
} as const

export function AnnouncementCard({ announcement: a, actions }: { announcement: Announcement; actions?: React.ReactNode }) {
  const s = styles[a.priority]
  const Icon = s.icon
  const edited = a.updatedAt !== a.createdAt
  const expired = a.expiresAt !== null && new Date(a.expiresAt).getTime() < Date.now()

  return (
    <article className={cn('relative rounded-3xl border p-4', s.box, expired && 'opacity-50')}>
      {/* En-tête : icône, badges et actions sur une ligne ; le texte prend toute la largeur dessous. */}
      <div className="flex items-start gap-3">
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-2xl', s.chip)}>
          <Icon size={18} />
        </span>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2 pt-2">
          <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide', s.chip)}>
            {announcementPriorityLabels[a.priority]}
          </span>
          {a.pinned && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-white/50">
              <Pin size={11} /> Épinglée
            </span>
          )}
          {expired && <span className="text-[11px] font-semibold text-white/40">Expirée</span>}
        </div>
        {actions && <div className="flex shrink-0 gap-1">{actions}</div>}
      </div>
      <h3 className="mt-3 font-display text-base font-bold text-white">{a.title}</h3>
      <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-white/70">{a.content}</p>
      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] text-white/45">
        {a.authorRole === 'admin' || a.authorRole === 'superadmin' ? <Logo size="sm" withText={false} className="h-7 w-7 rounded-full" /> : <Avatar name={a.authorName} size="xs" />}
        <span className="font-medium text-white/65">{a.authorName}</span>
        <span>·</span>
        <span>{edited ? `Mis à jour ${relativeTime(a.updatedAt)}` : relativeTime(a.createdAt)}</span>
      </div>
    </article>
  )
}
