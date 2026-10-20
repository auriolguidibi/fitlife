import { useState } from 'react'
import { Award, Lock } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Card, ProgressBar, Spinner, Tabs } from '@/components/ui'
import { cn } from '@/utils/cn'
import { formatDate } from '@/utils/format'
import type { Badge } from '@/types'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { badgeIcon, TypeIcon } from '@/components/ui'

export function BadgesPage() {
  const { data, loading } = useAsync(() => api.getBadges(), [])
  const [tier, setTier] = useState<string>('all')

  if (loading || !data) return <Spinner label="Chargement des badges…" />

  const earnedCount = data.earned.length

  const visible =
    tier === 'all' ? data.all : data.all.filter((b) => b.tier === tier)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Tes trophées"
        title="Badges & récompenses"
        subtitle={`${earnedCount} / ${data.all.length} badges débloqués. Chaque effort laisse une trace.`}
        icon={<Award size={22} />}
        image={pageHeroes.badges}
        imagePosition="50% 25%"
      >
        <div className="max-w-xs">
          <ProgressBar value={earnedCount} max={Math.max(1, data.all.length)} />
        </div>
      </PageHero>

      <Tabs
        value={tier}
        onChange={setTier}
        tabs={[
          { value: 'all', label: 'Tous' },
          { value: 'bronze', label: 'Bronze' },
          { value: 'silver', label: 'Argent' },
          { value: 'gold', label: 'Or' },
          { value: 'platinum', label: 'Platine' },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {visible.map((badge: Badge) => {
          const earned = data.earned.find((e) => e.badgeId === badge.id)
          return (
            <Card key={badge.id} padding="lg" className={cn('text-center', !earned && 'opacity-60')}>
              <div
                className={cn(
                  'mx-auto grid h-16 w-16 place-items-center rounded-2xl',
                  earned
                    ? 'bg-gradient-to-br from-fit to-fit-dark text-white shadow-fit'
                    : 'bg-ink-800 text-white/30',
                )}
              >
                {earned ? <TypeIcon icon={badgeIcon(badge.id)} size={28} /> : <Lock size={20} className="text-white/40" />}
              </div>
              <p className="mt-3 text-sm font-bold text-white">{badge.name}</p>
              <p className="mt-1 text-xs leading-snug text-white/50">{badge.description}</p>
              <p className="mt-2 text-[10px] font-semibold uppercase tracking-wide text-fit">
                {badge.requirement}
              </p>
              {earned && (
                <p className="mt-1 text-[10px] text-white/30">Obtenu le {formatDate(earned.earnedAt)}</p>
              )}
            </Card>
          )
        })}
      </div>
    </div>
  )
}