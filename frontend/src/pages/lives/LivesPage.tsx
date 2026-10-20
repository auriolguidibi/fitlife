import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Radio } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Badge, Spinner, Tabs } from '@/components/ui'
import { LiveCard } from '@/components/domain/LiveCard'
import { formatNumber } from '@/utils/format'
import type { LiveStatus } from '@/types'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

export function LivesPage() {
  const navigate = useNavigate()
  const { data, loading } = useAsync(() => api.getLives(), [])
  const [status, setStatus] = useState<LiveStatus | 'all'>('all')

  if (loading || !data) return <Spinner label="Chargement des lives…" />

  const liveNow = data.filter((l) => l.status === 'live')
  const visible = status === 'all' ? data : data.filter((l) => l.status === status)

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="En direct avec tes coachs"
        title="Lives"
        subtitle="Entraîne-toi en temps réel, pose tes questions, bouge avec la communauté."
        icon={<Radio size={22} />}
        image={pageHeroes.lives}
        imagePosition="50% 30%"
      >
        {liveNow.length > 0 ? (
          <span className="inline-flex w-fit items-center gap-2 rounded-full bg-red-500/90 px-3 py-1.5 text-xs font-bold text-white shadow-lg">
            <span className="h-2 w-2 animate-pulse rounded-full bg-white" />
            {liveNow.length} live{liveNow.length > 1 ? "s" : ""} en ce moment · {formatNumber(liveNow[0].viewers)} spectateurs
          </span>
        ) : (
          <span className="text-xs text-white/60">Aucun live en cours · rejoins-nous bientôt</span>
        )}
      </PageHero>

      <Tabs
        value={status}
        onChange={setStatus}
        tabs={[
          { value: 'all', label: 'Tous' },
          { value: 'live', label: 'En direct', count: liveNow.length },
          { value: 'scheduled', label: 'À venir' },
          { value: 'ended', label: 'Terminés' },
        ]}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {visible.map((live) => (
          <LiveCard key={live.id} live={live} onClick={() => navigate(`/lives/${live.id}`)} />
        ))}
        {visible.length === 0 && (
          <div className="sm:col-span-2">
            <Badge>Aucun live dans cette catégorie.</Badge>
          </div>
        )}
      </div>
    </div>
  )
}