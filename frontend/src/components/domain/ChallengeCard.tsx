import { Users } from 'lucide-react'
import type { Challenge, ChallengeParticipation } from '@/types'
import { AvatarStack, Badge, Button, Card, ProgressBar, challengeIcon } from '@/components/ui'
import { formatDate, formatNumber } from '@/utils/format'
import { challengeImage } from '@/data/images'

interface ChallengeCardProps {
  challenge: Challenge
  participation?: ChallengeParticipation
  onJoin?: (id: string) => void
  onLeave?: (id: string) => void
  joining?: boolean
}

const crowd = ['Amina', 'Koffi', 'Fatou', 'Moussa', 'Grace', 'Ibrahim', 'Nadia', 'Serge']

export function ChallengeCard({ challenge, participation, onJoin, onLeave, joining }: ChallengeCardProps) {
  const progress = participation?.progress ?? 0
  const pct = Math.min(100, (progress / challenge.target) * 100)
  // Visages différents d'un défi à l'autre, mais stables.
  const offset = challenge.id.length % crowd.length
  const faces = [...crowd.slice(offset), ...crowd.slice(0, offset)]
  const ChallengeIcon = challengeIcon(challenge.id)

  return (
    <Card padding="none" className="overflow-hidden">
      <div className="relative h-32">
        <img
          src={challengeImage(challenge.id, 700)}
          alt={challenge.title}
          loading="lazy"
          className="h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-700 via-ink-700/30 to-transparent" />
        <span className="absolute left-3 top-3 grid h-10 w-10 place-items-center rounded-2xl bg-ink-900/70 text-fit backdrop-blur">
          <ChallengeIcon size={18} />
        </span>
        <Badge tone="gray" className="absolute right-3 top-3 bg-ink-900/70 backdrop-blur">
          {challenge.days} j
        </Badge>
      </div>

      <div className="space-y-3 p-4 pt-1">
        <div>
          <h3 className="truncate text-lg font-bold text-white">{challenge.title}</h3>
          <p className="mt-0.5 text-xs text-white/55">{challenge.description}</p>
          <div className="mt-2.5 flex items-center gap-2">
            <AvatarStack names={faces} />
            <p className="inline-flex items-center gap-1 text-[11px] text-white/45">
              <Users size={11} /> {formatNumber(challenge.participants)} participants · jusqu’au{' '}
              {formatDate(challenge.endsAt)}
            </p>
          </div>
        </div>

        {participation ? (
          <div>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="text-white/60">Ta progression</span>
              <span className="font-semibold text-fit">
                {progress.toString().replace('.', ',')} / {challenge.target} {challenge.unit}
              </span>
            </div>
            <ProgressBar value={pct} />
            {onLeave && !participation.completed && (
              <button
                type="button"
                onClick={() => onLeave(challenge.id)}
                disabled={joining}
                className="mt-3 text-xs font-semibold text-white/50 underline-offset-2 transition hover:text-red-300 hover:underline disabled:opacity-40"
              >
                Quitter le défi
              </button>
            )}
          </div>
        ) : (
          <Button fullWidth onClick={() => onJoin?.(challenge.id)} loading={joining}>
            Rejoindre le défi
          </Button>
        )}
      </div>
    </Card>
  )
}
