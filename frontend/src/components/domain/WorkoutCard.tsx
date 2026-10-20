import { Check, Clock, Dumbbell, Flame, Layers, Play } from 'lucide-react'
import type { Workout } from '@/types'
import { Badge, Card } from '@/components/ui'
import { levelLabels, workoutTypeLabels } from '@/utils/labels'
import { workoutImage } from '@/data/images'
import { cn } from '@/utils/cn'

interface WorkoutCardProps {
  workout: Workout
  onClick?: () => void
  active?: boolean
  compact?: boolean
  featured?: boolean
}

const difficultyTone = (d: Workout['difficulty']) =>
  d === 'advanced' ? 'red' : d === 'intermediate' ? 'amber' : 'fit'

export function WorkoutCard({ workout, onClick, active, compact, featured }: WorkoutCardProps) {
  if (featured) {
    return (
      <div
        onClick={onClick}
        className="group relative h-56 cursor-pointer overflow-hidden rounded-3xl border border-white/5 sm:h-64"
      >
        <img
          src={workoutImage(workout.type, 1000)}
          alt={workoutTypeLabels[workout.type]}
          className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/50 to-transparent" />
        <div className="absolute left-4 top-4 flex gap-2">
          <Badge tone={difficultyTone(workout.difficulty)}>{levelLabels[workout.difficulty]}</Badge>
          {workout.completed && (
            <Badge tone="fit">
              <Check size={11} strokeWidth={3} /> Fait
            </Badge>
          )}
        </div>
        <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 p-5">
          <div className="min-w-0">
            <h3 className="font-display text-2xl font-extrabold text-white">{workoutTypeLabels[workout.type]}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-white/75">
              <span className="inline-flex items-center gap-1">
                <Clock size={13} /> {workout.duration} min
              </span>
              <span className="inline-flex items-center gap-1">
                <Layers size={13} /> {workout.exercises.length} exercices
              </span>
              <span className="inline-flex items-center gap-1">
                <Flame size={13} /> {workout.calories} kcal
              </span>
            </div>
          </div>
          <span className="grid h-14 w-14 shrink-0 place-items-center rounded-full bg-fit text-white shadow-fit transition group-hover:scale-110">
            <Play size={22} fill="currentColor" className="ml-0.5" />
          </span>
        </div>
      </div>
    )
  }

  return (
    <Card
      onClick={onClick}
      className={cn(
        'cursor-pointer transition hover:border-fit/40',
        active && 'border-fit/50 bg-fit/10',
        compact && 'p-3',
      )}
    >
      <div className="flex items-center gap-3">
        <div className={cn('relative shrink-0 overflow-hidden rounded-2xl', compact ? 'h-12 w-12' : 'h-16 w-16')}>
          <img
            src={workoutImage(workout.type, 200)}
            alt={workoutTypeLabels[workout.type]}
            loading="lazy"
            className="h-full w-full object-cover"
          />
          {workout.completed && (
            <span className="absolute inset-0 grid place-items-center bg-fit/70 text-ink-900">
              <Check size={20} strokeWidth={3} />
            </span>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-bold text-white">{workoutTypeLabels[workout.type]}</h3>
            {workout.completed && <Badge tone="fit">Fait</Badge>}
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-white/50">
            <span className="inline-flex items-center gap-1">
              <Clock size={12} /> {workout.duration} min
            </span>
            <span className="inline-flex items-center gap-1">
              <Layers size={12} /> {workout.exercises.length} ex.
            </span>
            <span className="inline-flex items-center gap-1">
              <Flame size={12} /> {workout.calories} kcal
            </span>
          </div>
        </div>
        <Badge tone={difficultyTone(workout.difficulty)}>{levelLabels[workout.difficulty]}</Badge>
      </div>
      {!compact && workout.equipment.length > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs text-white/40">
          <Dumbbell size={12} />
          {workout.equipment.join(' · ')}
        </div>
      )}
    </Card>
  )
}
