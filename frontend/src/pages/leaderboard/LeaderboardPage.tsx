import { useState } from 'react'
import { Crown, Flame, Trophy } from 'lucide-react'
import type { LeaderboardEntry, LeaderboardPeriod } from '@/types'
import { Avatar, RankMedal } from '@/components/ui'
import { cn } from '@/utils/cn'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Card, Skeleton } from '@/components/ui'
import { LeaderboardItem } from '@/components/domain/LeaderboardItem'
import { Tabs } from '@/components/ui'
import { periodLabels } from '@/utils/labels'
import { formatKm } from '@/utils/format'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

const podiumStyle = [
  { order: 'order-2', height: 'h-32', ring: 'ring-fit', glow: 'from-fit/35', num: 'text-fit' },
  { order: 'order-1', height: 'h-24', ring: 'ring-slate-300', glow: 'from-slate-300/20', num: 'text-slate-200' },
  { order: 'order-3', height: 'h-20', ring: 'ring-orange-400', glow: 'from-orange-400/25', num: 'text-orange-300' },
]

function Podium({ entries }: { entries: LeaderboardEntry[] }) {
  return (
    <div className="surface relative overflow-hidden rounded-3xl px-4 pb-0 pt-6">
      <div className="pointer-events-none absolute left-1/2 top-0 h-48 w-72 -translate-x-1/2 rounded-full bg-fit/15 blur-3xl" />
      <div className="relative grid grid-cols-3 items-end gap-3">
        {entries.map((e, i) => {
          const s = podiumStyle[i]
          return (
            <div key={e.userId} className={cn('flex flex-col items-center', s.order)}>
              {i === 0 && <Crown size={26} className="mb-1 text-amber-300 drop-shadow-[0_0_10px_rgba(252,211,77,0.6)]" />}
              <div className={cn('relative', i === 0 && 'drop-shadow-[0_0_24px_rgba(34,197,94,0.45)]')}>
                <Avatar
                  name={e.name}
                  src={e.avatarUrl}
                  size={i === 0 ? 'xl' : 'lg'}
                  className={cn('rounded-full ring-4 ring-offset-2 ring-offset-ink-800', s.ring)}
                />
                <RankMedal rank={e.rank} className="absolute -bottom-2 left-1/2 -translate-x-1/2 ring-2 ring-ink-800" />
              </div>
              <p className={cn('mt-3 max-w-full truncate text-sm font-bold', e.isCurrentUser ? 'text-fit' : 'text-white')}>
                {e.name}
              </p>
              <p className="text-xs font-semibold text-white/60">{formatKm(e.distanceKm)}</p>
              <div
                className={cn(
                  'mt-3 grid w-full place-items-center rounded-t-3xl border-x border-t border-white/10 bg-gradient-to-b to-transparent font-display text-3xl font-bold',
                  s.height,
                  s.glow,
                  s.num,
                )}
              >
                {e.rank}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function LeaderboardPage() {
  const [period, setPeriod] = useState<LeaderboardPeriod>('weekly')
  const { data, loading } = useAsync(() => api.getLeaderboard(period), [period])

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Chaque kilomètre compte"
        title="Classement"
        subtitle="Basé sur la distance validée. Grimpe les places, semaine après semaine."
        icon={<Trophy size={22} />}
        image={pageHeroes.leaderboard}
      />

      <Tabs
        value={period}
        onChange={setPeriod}
        tabs={(['daily', 'weekly', 'monthly', 'allTime'] as LeaderboardPeriod[]).map((p) => ({
          value: p,
          label: periodLabels[p],
        }))}
      />

      {loading || !data ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full" />
          ))}
        </div>
      ) : (
        <>
          {data.currentUserRank && (
            <Card variant="gradient">
              <p className="text-sm text-white/70">
                Tu es actuellement <span className="font-extrabold text-white">{data.currentUserRank.rank}
                {data.currentUserRank.rank === 1 ? 'er' : 'e'}</span> avec{' '}
                <span className="font-extrabold text-fit">{formatKm(data.currentUserRank.distanceKm)}</span>
              </p>
              {data.nextTargetName && data.nextTargetKm ? (
                <p className="mt-2 flex items-center gap-2 text-sm font-semibold text-white">
                  <Flame size={16} className="text-fit" />
                  Plus que {data.nextTargetKm.toString().replace('.', ',')} km pour dépasser {data.nextTargetName} !
                </p>
              ) : data.currentUserRank.rank === 1 ? (
                <p className="mt-2 text-sm font-semibold text-fit">
                  Tu es en tête ! Garde ton avance.
                </p>
              ) : (
                <p className="mt-2 text-sm font-semibold text-fit">
                  Chaque activité validée te fait grimper : pars marcher ou courir !
                </p>
              )}
            </Card>
          )}

          {data.entries.length >= 3 && <Podium entries={data.entries.slice(0, 3)} />}

          <div className="space-y-2">
            {data.entries.slice(data.entries.length >= 3 ? 3 : 0).map((entry) => (
              <LeaderboardItem key={entry.userId} entry={entry} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}
