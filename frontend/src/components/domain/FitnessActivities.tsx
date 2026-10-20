import { useState } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import { CheckCircle2, Clapperboard, Play } from 'lucide-react'
import { Badge, Modal } from '@/components/ui'
import { VideoLangSwitch, VideoPlayer, useVideoLang } from '@/components/domain/VideoPlayer'
import { bodyPartLabels, exerciseVideos } from '@/data/exerciseVideos'
import type { ExerciseVideo } from '@/data/exerciseVideos'
import { cn } from '@/utils/cn'

/**
 * Section « Activités fitness » de l'accueil : les exercices avec leur vidéo de démonstration,
 * en français par défaut ou en anglais. Un toucher ouvre la vidéo et les consignes.
 */
export function FitnessActivities() {
  const [lang] = useVideoLang()
  const [part, setPart] = useState<string>('all')
  const [open, setOpen] = useState<ExerciseVideo | null>(null)

  const parts = ['all', ...Object.keys(bodyPartLabels).filter((p) => exerciseVideos.some((v) => v.exercise.bodyPart === p))]
  const list = exerciseVideos.filter((v) => part === 'all' || v.exercise.bodyPart === part)

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
          <Clapperboard size={18} className="text-fit" /> Activités fitness
        </h2>
        <div className="flex items-center gap-3">
          <VideoLangSwitch />
          <Link to="/videos" className="hidden shrink-0 text-xs font-semibold text-fit sm:inline">
            Tout voir
          </Link>
        </div>
      </div>

      <div className="no-scrollbar -mx-4 mb-3 flex gap-2 overflow-x-auto px-4">
        {parts.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPart(p)}
            className={cn(
              'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
              part === p ? 'border-fit bg-fit text-white' : 'border-white/10 bg-ink-700 text-white/60 hover:text-white',
            )}
          >
            {p === 'all' ? 'Tout' : bodyPartLabels[p]}
          </button>
        ))}
      </div>

      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1">
        {list.map((v) => (
          <button
            key={v.exercise.id}
            type="button"
            onClick={() => setOpen(v)}
            className="group relative h-52 w-40 shrink-0 snap-start overflow-hidden rounded-3xl border border-white/[0.07] text-left sm:w-48"
          >
            <img
              src={`https://i.ytimg.com/vi/${v.ids[lang][0]}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-110"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-ink-900/10" />
            <span className="absolute right-3 top-3 grid h-10 w-10 place-items-center rounded-full bg-fit text-white shadow-fit transition group-hover:scale-110">
              <Play size={16} fill="currentColor" className="ml-0.5" />
            </span>
            <span className="absolute left-3 top-3 rounded-full bg-ink-900/70 px-2 py-0.5 text-[10px] font-bold uppercase text-white/85 backdrop-blur">
              {lang === 'fr' ? 'FR' : 'EN'}
            </span>
            <span className="absolute bottom-3 left-3 right-3">
              <span className="block font-display text-base font-bold leading-tight text-white">{v.exercise.name}</span>
              <span className="block text-[11px] text-white/65">
                {bodyPartLabels[v.exercise.bodyPart] ?? v.exercise.bodyPart} ·{' '}
                {v.exercise.durationSeconds ? `${v.exercise.durationSeconds}s` : `${v.exercise.sets}×${v.exercise.reps}`}
              </span>
            </span>
          </button>
        ))}
      </div>

      {open &&
        createPortal(
          <Modal open onClose={() => setOpen(null)} title={open.exercise.name}>
            <div className="space-y-4">
              <VideoPlayer ids={open.ids} title={open.exercise.name} />
              <p className="text-sm text-white/70">{open.exercise.description}</p>
              <div className="flex flex-wrap gap-1.5">
                {open.exercise.muscles.map((m) => (
                  <Badge key={m} tone="fit">
                    {m}
                  </Badge>
                ))}
              </div>
              <ul className="space-y-1.5">
                {open.exercise.tips.map((tip) => (
                  <li key={tip} className="flex gap-2 text-sm text-white/65">
                    <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-fit" /> {tip}
                  </li>
                ))}
              </ul>
            </div>
          </Modal>,
          document.body,
        )}
    </section>
  )
}
