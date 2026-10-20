import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CalendarDays, ChevronLeft, ChevronRight, Dumbbell, Target } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Badge, Card, ProgressBar, Spinner } from '@/components/ui'
import { WorkoutCard } from '@/components/domain/WorkoutCard'
import { goalLabels } from '@/utils/labels'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

export function ProgramPage() {
  const navigate = useNavigate()
  const { data: program, loading, reload } = useAsync(() => api.getProgram(), [])
  const [week, setWeek] = useState<number | null>(null)

  if (loading || !program) return <Spinner label="Chargement de ton programme…" />

  const currentWeek = week ?? program.currentWeek
  const weekPlan = program.weeks.find((w) => w.week === currentWeek) ?? program.weeks[0]
  const completed = program.weeks.flatMap((w) => w.workouts).filter((w) => w.completed).length
  const total = program.weeks.flatMap((w) => w.workouts).length
  void reload

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        eyebrow="8 semaines pour toi"
        title="Ton programme"
        subtitle="Généré selon ton objectif, ton niveau et le temps dont tu disposes."
        icon={<Dumbbell size={22} />}
        image={pageHeroes.program}
      >
        <div className="flex max-w-sm items-center gap-3">
          <ProgressBar value={completed} max={Math.max(1, total)} className="flex-1" />
          <span className="text-xs font-semibold text-white/80">
            {completed}/{total} séances
          </span>
        </div>
      </PageHero>

      <Card variant="gradient">
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Metric label="Objectif" value={goalLabels[program.goal]} />
          <Metric label="Durée" value={`${program.durationWeeks} semaines`} />
          <Metric label="Semaine" value={`${program.currentWeek} / ${program.durationWeeks}`} />
          <Metric label="Progression" value={`${program.progress}%`} />
        </div>
        <div className="mt-4">
          <ProgressBar value={program.progress} showLabel />
        </div>
        <p className="mt-2 text-xs text-white/50">
          {completed} séance(s) terminée(s) sur {total}
        </p>
      </Card>

      <Card className="flex items-center justify-between">
        <button
          onClick={() => setWeek(Math.max(1, currentWeek - 1))}
          disabled={currentWeek <= 1}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink-800 text-white/70 disabled:opacity-30"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="text-center">
          <p className="text-xs text-white/50">Semaine</p>
          <p className="text-xl font-extrabold text-white">{currentWeek}</p>
        </div>
        <button
          onClick={() => setWeek(Math.min(program.durationWeeks, currentWeek + 1))}
          disabled={currentWeek >= program.durationWeeks}
          className="grid h-10 w-10 place-items-center rounded-full bg-ink-800 text-white/70 disabled:opacity-30"
        >
          <ChevronRight size={18} />
        </button>
      </Card>

      <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${program.weeks.length}, minmax(0, 1fr))` }}>
        {program.weeks.map((w) => (
          <button
            key={w.week}
            onClick={() => setWeek(w.week)}
            className={`rounded-xl border px-0 py-2 text-xs font-semibold transition sm:rounded-2xl sm:text-sm ${
              currentWeek === w.week
                ? 'border-fit bg-fit text-white'
                : 'border-white/10 bg-ink-700 text-white/60'
            }`}
          >
            S{w.week}
          </button>
        ))}
      </div>

      <section>
        <div className="mb-3 flex items-center gap-2">
          <Dumbbell size={18} className="text-fit" />
          <h2 className="text-lg font-bold text-white">Séances de la semaine {currentWeek}</h2>
        </div>
        <div className="space-y-3">
          {weekPlan.workouts.map((workout) => (
            <WorkoutCard
              key={workout.id}
              workout={workout}
              onClick={() => navigate(`/workout/${workout.id}`)}
            />
          ))}
        </div>
      </section>

      <Card variant="glass" className="flex items-start gap-3">
        <Target className="mt-0.5 shrink-0 text-fit" size={18} />
        <div className="text-sm">
          <p className="font-semibold text-white">Conseil FitLife</p>
          <p className="text-white/60">
            Respecte tes jours de repos : la progression se construit aussi pendant la récupération.
          </p>
        </div>
      </Card>

      <div className="flex items-center gap-2 text-xs text-white/40">
        <CalendarDays size={14} /> {program.daysPerWeek} jours d’entraînement par semaine
        <Badge tone="gray">v{program.id.slice(-4)}</Badge>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-0.5 text-sm font-bold text-white">{value}</p>
    </div>
  )
}
