import { useEffect, useState } from 'react'
import { ExternalLink, Play, RefreshCw, Square } from 'lucide-react'
import type { VideoLang, VideoSet } from '@/data/exerciseVideos'
import { cn } from '@/utils/cn'

const LANG_KEY = 'fitlife:video-lang'
const LANG_EVENT = 'fitlife:video-lang'

function readLang(): VideoLang {
  try {
    return localStorage.getItem(LANG_KEY) === 'en' ? 'en' : 'fr'
  } catch {
    return 'fr'
  }
}

/** Langue des vidéos : français par défaut, l'anglais reste un choix de l'utilisateur (mémorisé). */
export function useVideoLang(): [VideoLang, (lang: VideoLang) => void] {
  const [lang, setLang] = useState<VideoLang>(readLang)
  useEffect(() => {
    const sync = () => setLang(readLang())
    window.addEventListener(LANG_EVENT, sync)
    return () => window.removeEventListener(LANG_EVENT, sync)
  }, [])
  const change = (next: VideoLang) => {
    try {
      localStorage.setItem(LANG_KEY, next)
    } catch {
      /* stockage indisponible */
    }
    setLang(next)
    window.dispatchEvent(new Event(LANG_EVENT))
  }
  return [lang, change]
}

/** Sélecteur FR / EN des vidéos. */
export function VideoLangSwitch({ className }: { className?: string }) {
  const [lang, setLang] = useVideoLang()
  return (
    <div className={cn('inline-flex rounded-full border border-white/10 bg-ink-800 p-0.5 text-[11px] font-bold', className)} role="group" aria-label="Langue des vidéos">
      {(
        [
          ['fr', 'Français'],
          ['en', 'English'],
        ] as [VideoLang, string][]
      ).map(([value, label]) => (
        <button
          key={value}
          type="button"
          onClick={() => setLang(value)}
          aria-pressed={lang === value}
          className={cn('rounded-full px-3 py-1 transition', lang === value ? 'bg-fit text-white' : 'text-white/55 hover:text-white')}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

/**
 * Lecteur vidéo YouTube léger : la miniature s'affiche d'abord, le lecteur ne se charge
 * qu'au toucher. Vidéo en français par défaut (anglais au choix), avec une vidéo de secours
 * et un lien « Ouvrir dans YouTube » si la lecture intégrée échoue.
 */
export function VideoPlayer({ ids, title, className, showLangSwitch = true }: { ids: VideoSet; title: string; className?: string; showLangSwitch?: boolean }) {
  const [lang] = useVideoLang()
  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const list = ids[lang]
  const id = list[index] ?? list[0]

  // Changement de langue : on revient à la vidéo principale, sans lancer la lecture.
  useEffect(() => {
    setIndex(0)
    setPlaying(false)
  }, [lang])

  return (
    <div className={cn('space-y-2', className)}>
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl border border-white/10 bg-black">
        {playing ? (
          <iframe
            key={id}
            src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&hl=${lang}&cc_lang_pref=${lang}`}
            title={title}
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
            className="absolute inset-0 h-full w-full"
          />
        ) : (
          <button type="button" onClick={() => setPlaying(true)} className="group absolute inset-0 h-full w-full" aria-label={`Lire la vidéo : ${title}`}>
            <img
              src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`}
              alt=""
              loading="lazy"
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-900/80 via-ink-900/10 to-ink-900/20" />
            <span className="absolute left-1/2 top-1/2 grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-fit text-white shadow-[0_0_40px_rgba(34,197,94,0.55)] transition group-hover:scale-110 sm:h-16 sm:w-16">
              <Play size={24} fill="currentColor" className="ml-1" />
            </span>
            <span className="absolute bottom-3 left-3 rounded-full bg-ink-900/75 px-2.5 py-1 text-[11px] font-semibold text-white backdrop-blur">
              {lang === 'fr' ? 'Vidéo en français' : 'Video in English'}
              {index > 0 && ' · secours'}
            </span>
          </button>
        )}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
        {showLangSwitch ? <VideoLangSwitch /> : <span />}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {playing && (
            <button
              type="button"
              onClick={() => setPlaying(false)}
              className="inline-flex h-8 items-center gap-1.5 rounded-full bg-red-500 px-3 font-bold text-white transition hover:bg-red-600"
            >
              <Square size={11} fill="currentColor" /> Arrêter la vidéo
            </button>
          )}
          <button
            type="button"
            onClick={() => {
              setIndex((i) => (i + 1) % list.length)
              setPlaying(true)
            }}
            className="inline-flex items-center gap-1 font-semibold text-white/55 transition hover:text-white"
          >
            <RefreshCw size={12} /> {index === 0 ? 'Autre vidéo' : 'Vidéo principale'}
          </button>
          <a
            href={`https://www.youtube.com/watch?v=${id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-semibold text-fit"
          >
            <ExternalLink size={12} /> YouTube
          </a>
        </div>
      </div>
    </div>
  )
}
