import { Calendar, Clock, Eye, Radio } from 'lucide-react'
import type { LiveSession } from '@/types'
import { Avatar, Badge, Card } from '@/components/ui'
import { levelLabels } from '@/utils/labels'
import { formatDateTime, formatNumber } from '@/utils/format'
import { liveImage } from '@/data/images'
import { cn } from '@/utils/cn'

export function LiveCard({ live, onClick }: { live: LiveSession; onClick?: () => void }) {
  const isLive = live.status === 'live'
  return (
    <Card
      onClick={onClick}
      padding="none"
      className={cn('group cursor-pointer overflow-hidden transition hover:border-fit/40')}
    >
      <div className="relative h-40 overflow-hidden">
        <img
          src={liveImage(live.title, 700)}
          alt={live.title}
          loading="lazy"
          className={cn(
            'h-full w-full object-cover transition duration-700 group-hover:scale-105',
            live.status === 'ended' && 'grayscale-[60%]',
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-transparent to-ink-900/40" />
        {isLive ? (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-2.5 py-1 text-[10px] font-bold text-white shadow-lg">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white" /> EN DIRECT
          </span>
        ) : (
          <span className="absolute left-3 top-3 inline-flex items-center gap-1 rounded-full bg-ink-900/80 px-2.5 py-1 text-[10px] font-bold text-white/80 backdrop-blur">
            {live.status === 'ended' ? 'Replay' : 'À venir'}
          </span>
        )}
        {live.premiumOnly && (
          <span className="absolute right-3 top-3 rounded-full bg-amber-400/90 px-2.5 py-1 text-[10px] font-bold text-ink-900">
            PREMIUM
          </span>
        )}
        {isLive && (
          <span className="absolute bottom-3 right-3 inline-flex items-center gap-1 rounded-full bg-ink-900/80 px-2.5 py-1 text-[10px] font-semibold text-white backdrop-blur">
            <Eye size={11} /> {formatNumber(live.viewers)}
          </span>
        )}
      </div>
      <div className="p-4">
        <h3 className="font-bold text-white">{live.title}</h3>
        <p className="mt-0.5 line-clamp-2 text-xs text-white/50">{live.description}</p>
        <div className="mt-3 flex items-center gap-2">
          <Avatar name={live.coachName} src={live.coachAvatarUrl} size="sm" online={isLive} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-semibold text-white/85">{live.coachName}</p>
            <p className="flex flex-wrap items-center gap-x-1 text-[11px] text-white/40">
              {isLive ? <Radio size={10} /> : <Calendar size={10} />}
              {formatDateTime(live.scheduledAt)}
              <span className="mx-1">·</span>
              <Clock size={10} /> {live.durationMinutes} min
            </p>
          </div>
          <Badge tone="gray" className="shrink-0">
            {levelLabels[live.level]}
          </Badge>
        </div>
      </div>
    </Card>
  )
}
