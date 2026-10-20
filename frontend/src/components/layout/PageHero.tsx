import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft } from 'lucide-react'
import { cn } from '@/utils/cn'

interface PageHeroProps {
  title: ReactNode
  subtitle?: ReactNode
  /** Petit libellé au-dessus du titre (ex. « Nutrition »). */
  eyebrow?: string
  icon?: ReactNode
  image: string
  /** Position de recadrage de la photo (object-position). */
  imagePosition?: string
  actions?: ReactNode
  /** Chemin de retour : affiche un bouton « précédent ». */
  back?: string
  /** Contenu sous le titre (stats, progression…). */
  children?: ReactNode
  /** Version basse, pour les pages où l'espace vertical compte (chat…). */
  compact?: boolean
  className?: string
}

/** En-tête photo commun à toutes les pages de l'app. */
export function PageHero({
  title,
  subtitle,
  eyebrow,
  icon,
  image,
  imagePosition = '50% 40%',
  actions,
  back,
  children,
  compact,
  className,
}: PageHeroProps) {
  const navigate = useNavigate()

  return (
    <header
      className={cn(
        'group relative isolate overflow-hidden rounded-[2rem] border border-white/[0.07] shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)]',
        className,
      )}
    >
      <img
        src={image}
        alt=""
        style={{ objectPosition: imagePosition }}
        className="absolute inset-0 -z-10 h-full w-full object-cover transition duration-[1.5s] group-hover:scale-[1.03]"
      />
      <div className="absolute inset-0 -z-10 bg-gradient-to-r from-ink-900 via-ink-900/80 to-ink-900/10" />
      <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-900/70 via-transparent to-transparent" />
      <div className="pointer-events-none absolute -bottom-24 -left-16 -z-10 h-56 w-56 rounded-full bg-fit/25 blur-3xl" />

      <div
        className={cn(
          'flex flex-col justify-end',
          compact ? 'gap-3 p-4 sm:p-5' : 'min-h-[11rem] gap-4 p-5 sm:min-h-[13rem] sm:p-7',
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            {back && (
              <button
                onClick={() => navigate(back)}
                className="grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-ink-900/50 text-white/80 backdrop-blur-md transition hover:bg-ink-900/80 hover:text-white"
                aria-label="Retour"
              >
                <ChevronLeft size={18} />
              </button>
            )}
            {icon && (
              <span className="grid h-11 w-11 place-items-center rounded-2xl border border-fit/30 bg-fit/15 text-fit backdrop-blur-md">
                {icon}
              </span>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </div>

        <div className="max-w-xl">
          {eyebrow && (
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-[0.18em] text-fit">{eyebrow}</p>
          )}
          <h1
            className={cn(
              'font-extrabold leading-tight text-white',
              compact ? 'text-2xl sm:text-[1.75rem]' : 'text-[1.75rem] sm:text-4xl',
            )}
          >
            {title}
          </h1>
          {subtitle && <p className="mt-1.5 text-sm leading-relaxed text-white/70">{subtitle}</p>}
        </div>

        {children}
      </div>
    </header>
  )
}

/** Titre de section homogène (« Séance du jour », « Lives à venir »…). */
export function SectionTitle({
  title,
  icon,
  action,
  className,
}: {
  title: ReactNode
  icon?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <h2 className="flex items-center gap-2.5 text-lg font-bold text-white">
        {icon && (
          <span className="grid h-8 w-8 place-items-center rounded-xl bg-fit/15 text-fit [&>svg]:h-4 [&>svg]:w-4">
            {icon}
          </span>
        )}
        {title}
      </h2>
      {action}
    </div>
  )
}
