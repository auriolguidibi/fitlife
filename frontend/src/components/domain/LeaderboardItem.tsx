import type { LeaderboardEntry } from '@/types'
import { Avatar, RankMedal } from '@/components/ui'
import { formatKm } from '@/utils/format'
import { cn } from '@/utils/cn'

export function LeaderboardItem({ entry }: { entry: LeaderboardEntry }) {
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl px-3 py-2.5 transition hover:translate-x-0.5',
        entry.isCurrentUser
          ? 'border border-fit/40 bg-gradient-to-r from-fit/20 to-fit/5 shadow-fit'
          : 'surface hover:border-white/10',
      )}
    >
      <div
        className={cn(
          'grid h-8 w-8 shrink-0 place-items-center rounded-xl text-sm font-extrabold',
          entry.isCurrentUser ? 'bg-fit text-white' : 'bg-white/[0.05] text-white/60',
        )}
      >
        {entry.rank <= 3 ? <RankMedal rank={entry.rank} size="sm" /> : entry.rank}
      </div>
      <Avatar name={entry.name} src={entry.avatarUrl} size="sm" />
      <div className="min-w-0 flex-1">
        <p className={cn('truncate text-sm font-semibold', entry.isCurrentUser ? 'text-fit' : 'text-white')}>
          {entry.name} {entry.isCurrentUser && <span className="text-xs font-medium text-white/60">(toi)</span>}
        </p>
      </div>
      <span className="font-display text-sm font-bold text-white">{formatKm(entry.distanceKm)}</span>
    </div>
  )
}
