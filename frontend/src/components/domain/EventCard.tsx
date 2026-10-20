import { CalendarDays, Check, Clock, Globe, MapPin, Users } from 'lucide-react'
import type { FitEvent } from '@/types'
import { Badge, Button, Card } from '@/components/ui'
import { eventCategoryLabels } from '@/utils/labels'
import { formatNumber } from '@/utils/format'
import { pageHeroes } from '@/data/images'
import { cn } from '@/utils/cn'

export function eventDateParts(iso: string) {
  const d = new Date(iso)
  return {
    day: d.toLocaleDateString('fr-FR', { day: '2-digit' }),
    month: d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', ''),
    weekday: d.toLocaleDateString('fr-FR', { weekday: 'long' }),
    time: d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  }
}

interface EventCardProps {
  event: FitEvent
  onToggle?: (event: FitEvent) => void
  busy?: boolean
  compact?: boolean
}

export function EventCard({ event, onToggle, busy, compact }: EventCardProps) {
  const date = eventDateParts(event.startsAt)
  const full = event.capacity !== null && event.attendees >= event.capacity && !event.attending
  const past = new Date(event.startsAt).getTime() + event.durationMinutes * 60e3 < Date.now()
  const fill = event.capacity ? Math.min(100, (event.attendees / event.capacity) * 100) : null

  return (
    <Card padding="none" className={cn('group overflow-hidden', past && 'opacity-60')}>
      <div className={cn('relative overflow-hidden', compact ? 'h-28' : 'h-40')}>
        <img
          src={event.coverUrl || pageHeroes.challenges}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-800 via-ink-900/20 to-transparent" />
        <div className="absolute left-3 top-3 grid w-14 place-items-center rounded-2xl bg-white py-1.5 text-ink-900 shadow-lg">
          <span className="font-display text-xl font-extrabold leading-none">{date.day}</span>
          <span className="text-[10px] font-bold uppercase tracking-wide text-fit-dark">{date.month}</span>
        </div>
        <Badge tone="gray" className="absolute right-3 top-3 border-white/15 bg-ink-900/70 backdrop-blur">
          {eventCategoryLabels[event.category]}
        </Badge>
        {event.attending && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-fit px-2.5 py-1 text-[11px] font-bold text-white">
            <Check size={12} strokeWidth={3} /> Inscrit·e
          </span>
        )}
      </div>

      <div className="space-y-3 p-4">
        <div>
          <h3 className="font-display text-lg font-bold leading-snug text-white">{event.title}</h3>
          {!compact && <p className="mt-1 line-clamp-2 text-sm text-white/55">{event.description}</p>}
        </div>

        <div className="grid gap-1.5 text-xs text-white/60">
          <span className="inline-flex items-center gap-2">
            <CalendarDays size={14} className="text-fit" />
            <span className="capitalize">{date.weekday}</span> à {date.time}
            <span className="text-white/30">·</span>
            <Clock size={13} className="text-white/40" /> {event.durationMinutes} min
          </span>
          <span className="inline-flex items-center gap-2">
            {event.online ? <Globe size={14} className="text-fit" /> : <MapPin size={14} className="text-fit" />}
            <span className="truncate">{event.location || (event.online ? 'En ligne' : 'Lieu à préciser')}</span>
          </span>
          <span className="inline-flex items-center gap-2">
            <Users size={14} className="text-fit" />
            {formatNumber(event.attendees)} participant{event.attendees > 1 ? 's' : ''}
            {event.capacity !== null && <span className="text-white/40">/ {event.capacity} places</span>}
          </span>
        </div>

        {fill !== null && (
          <div className="h-1.5 overflow-hidden rounded-full bg-white/[0.08]">
            <div
              className={cn('h-full rounded-full', fill >= 100 ? 'bg-amber-400' : 'bg-fit')}
              style={{ width: `${fill}%` }}
            />
          </div>
        )}

        {onToggle && !past && (
          <Button
            fullWidth
            variant={event.attending ? 'outline' : 'primary'}
            disabled={full}
            loading={busy}
            onClick={() => onToggle(event)}
          >
            {event.attending ? 'Me désinscrire' : full ? 'Complet' : 'Je participe'}
          </Button>
        )}
      </div>
    </Card>
  )
}
