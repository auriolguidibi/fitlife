import { useState } from 'react'
import { CheckCircle2, Clapperboard, Search, Timer } from 'lucide-react'
import { Badge, Card, EmptyState } from '@/components/ui'
import { PageHero } from '@/components/layout/PageHero'
import { VideoLangSwitch, VideoPlayer } from '@/components/domain/VideoPlayer'
import { bodyPartLabels, exerciseVideos } from '@/data/exerciseVideos'
import { pageHeroes } from '@/data/images'
import { cn } from '@/utils/cn'

type Filter = 'all' | keyof typeof bodyPartLabels

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')

/** Bibliothèque vidéo : une section par exercice (vidéo, muscles, consignes). */
export function VideosPage() {
  const [filter, setFilter] = useState<Filter>('all')
  const [query, setQuery] = useState('')

  const q = normalize(query.trim())
  const visible = exerciseVideos.filter(
    ({ exercise }) =>
      (filter === 'all' || exercise.bodyPart === filter) &&
      (!q || normalize(exercise.name).includes(q) || exercise.muscles.some((m) => normalize(m).includes(q))),
  )

  const parts = Object.keys(bodyPartLabels).filter((p) => exerciseVideos.some((v) => v.exercise.bodyPart === p))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Apprends le bon geste"
        title="Vidéos"
        subtitle={`${exerciseVideos.length} exercices expliqués en vidéo, en français (anglais au choix).`}
        icon={<Clapperboard size={22} />}
        image={pageHeroes.program}
      />

      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-white/[0.06] bg-ink-800/60 px-3 py-2">
          <p className="text-xs text-white/60">Langue des vidéos</p>
          <VideoLangSwitch />
        </div>
        <label className="flex h-12 items-center gap-2 rounded-2xl border border-white/10 bg-ink-800 px-4 focus-within:border-fit/50">
          <Search size={16} className="text-white/40" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Chercher un exercice ou un muscle…"
            className="h-full min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/30"
          />
        </label>
        <div className="flex flex-wrap gap-2">
          {[{ value: 'all' as Filter, label: `Tout · ${exerciseVideos.length}` }, ...parts.map((p) => ({ value: p as Filter, label: bodyPartLabels[p] }))].map((f) => (
            <button
              key={f.value}
              type="button"
              onClick={() => setFilter(f.value)}
              className={cn(
                'rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                filter === f.value ? 'border-fit bg-fit text-white' : 'border-white/10 bg-ink-800 text-white/60 hover:text-white',
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {visible.length === 0 ? (
        <EmptyState icon={<Search size={28} />} title="Aucune vidéo trouvée" description="Essaie un autre mot-clé." />
      ) : (
        <div className="grid gap-5 lg:grid-cols-2">
          {visible.map(({ exercise, ids }, i) => (
            <Card key={exercise.id} padding="none" className="overflow-hidden">
              <section aria-labelledby={`video-${exercise.id}`} className="space-y-3 p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-fit/15 font-display text-sm font-extrabold text-fit">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <div className="min-w-0 flex-1">
                    <h2 id={`video-${exercise.id}`} className="font-display text-lg font-bold text-white">
                      {exercise.name}
                    </h2>
                    <p className="text-xs text-white/50">{bodyPartLabels[exercise.bodyPart] ?? exercise.bodyPart}</p>
                  </div>
                  <Badge tone="gray" className="shrink-0">
                    <Timer size={11} />
                    {exercise.durationSeconds ? `${exercise.durationSeconds}s` : `${exercise.sets}×${exercise.reps}`}
                  </Badge>
                </div>

                <VideoPlayer ids={ids} title={exercise.name} showLangSwitch={false} />

                <p className="text-sm text-white/65">{exercise.description}</p>
                <div className="flex flex-wrap gap-1.5">
                  {exercise.muscles.map((m) => (
                    <Badge key={m} tone="fit">
                      {m}
                    </Badge>
                  ))}
                </div>
                <ul className="space-y-1.5">
                  {exercise.tips.map((tip) => (
                    <li key={tip} className={cn('flex gap-2 text-xs text-white/60')}>
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-fit" /> {tip}
                    </li>
                  ))}
                </ul>
              </section>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
