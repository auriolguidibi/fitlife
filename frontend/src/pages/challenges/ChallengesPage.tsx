import { useState } from 'react'
import { Award, Target } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Card, Spinner, StatCard } from '@/components/ui'
import { ChallengeCard } from '@/components/domain/ChallengeCard'
import { formatNumber } from '@/utils/format'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

export function ChallengesPage() {
  const { data, loading, reload } = useAsync(
    async () => {
      const [challenges, participations] = await Promise.all([
        api.getChallenges(),
        api.getParticipations(),
      ])
      return { challenges, participations }
    },
    [],
  )
  const [joining, setJoining] = useState<string | null>(null)

  if (loading || !data) return <Spinner label="Chargement des défis…" />

  const participationMap = new Map(data.participations.map((p) => [p.challengeId, p]))
  const active = data.participations.length
  const completed = data.participations.filter((p) => p.completed).length

  const join = async (id: string) => {
    setJoining(id)
    try {
      await api.joinChallenge(id)
      reload()
    } finally {
      setJoining(null)
    }
  }

  const leave = async (id: string) => {
    setJoining(id)
    try {
      await api.leaveChallenge(id)
      reload()
    } finally {
      setJoining(null)
    }
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Se dépasser"
        title="Défis du moment"
        subtitle="Relève des défis, gagne des badges et grimpe au classement."
        icon={<Target size={22} />}
        image={pageHeroes.challenges}
      />

      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Défis actifs" value={active} icon={<Target size={14} />} />
        <StatCard label="Terminés" value={completed} icon={<Award size={14} />} />
        <StatCard label="Participants" value={formatNumber(data.challenges.reduce((s, c) => s + c.participants, 0))} />
      </div>

      <div className="space-y-4">
        {data.challenges.map((challenge) => (
          <ChallengeCard
            key={challenge.id}
            challenge={challenge}
            participation={participationMap.get(challenge.id)}
            onJoin={join}
            onLeave={leave}
            joining={joining === challenge.id}
          />
        ))}
      </div>

      <Card variant="glass" className="flex items-start gap-3 text-sm">
        <Award className="mt-0.5 shrink-0 text-fit" size={18} />
        <p className="text-white/60">
          Chaque défi terminé débloque un badge. Les classements de défi sont mis à jour après chaque
          activité validée.
        </p>
      </Card>
    </div>
  )
}
