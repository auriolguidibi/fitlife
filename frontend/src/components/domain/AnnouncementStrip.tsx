import { useState } from 'react'
import { AlertTriangle, ChevronRight, Info, Megaphone, Pin } from 'lucide-react'
import type { Announcement } from '@/types'
import { Modal } from '@/components/ui'
import { AnnouncementCard } from './AnnouncementCard'
import { relativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'

const tone = {
  info: { bar: 'bg-sky-400', chip: 'bg-sky-400/15 text-sky-300', icon: Info },
  important: { bar: 'bg-fit', chip: 'bg-fit/15 text-fit', icon: Megaphone },
  urgent: { bar: 'bg-red-400', chip: 'bg-red-400/15 text-red-300', icon: AlertTriangle },
} as const

/** Annonces de l'accueil, en version compacte et défilante ; le détail s'ouvre au toucher. */
export function AnnouncementStrip({ announcements }: { announcements: Announcement[] }) {
  const [open, setOpen] = useState<Announcement | null>(null)
  if (announcements.length === 0) return null
  const single = announcements.length === 1

  return (
    <section>
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 lg:mx-0 lg:px-0">
        {announcements.map((a) => {
          const t = tone[a.priority]
          const Icon = t.icon
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => setOpen(a)}
              className={cn(
                'surface group relative flex shrink-0 snap-start items-start gap-3 overflow-hidden rounded-2xl py-3 pl-4 pr-3 text-left transition hover:border-white/15',
                single ? 'w-full' : 'w-[85%] sm:w-[calc(50%-0.375rem)]',
              )}
            >
              <span className={cn('absolute inset-y-0 left-0 w-1', t.bar)} />
              <span className={cn('mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl', t.chip)}>
                <Icon size={15} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-1.5">
                  {a.pinned && <Pin size={11} className="shrink-0 text-white/40" />}
                  <span className="truncate text-sm font-bold text-white">{a.title}</span>
                </span>
                <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-white/55">{a.content}</span>
                <span className="mt-1 block text-[10px] text-white/35">
                  {a.authorName} · {relativeTime(a.updatedAt)}
                </span>
              </span>
              <ChevronRight size={16} className="mt-2 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-white/60" />
            </button>
          )
        })}
      </div>

      <Modal open={!!open} onClose={() => setOpen(null)} title="Annonce">
        {open && <AnnouncementCard announcement={open} />}
      </Modal>
    </section>
  )
}
