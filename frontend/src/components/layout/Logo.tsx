import { cn } from '@/utils/cn'

export const LOGO_MARK = `${import.meta.env.BASE_URL}brand/fitlife-mark.png`
export const LOGO_FULL = `${import.meta.env.BASE_URL}brand/fitlife-logo.webp`

/** Logo FitLife : pictogramme officiel (coureur + feuille) et nom de marque. */
export function Logo({
  size = 'md',
  withText = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg'
  withText?: boolean
  className?: string
}) {
  const box = { sm: 'h-8 w-8', md: 'h-10 w-10', lg: 'h-12 w-12' }
  const text = { sm: 'text-lg', md: 'text-xl', lg: 'text-2xl' }
  return (
    <div className="flex items-center gap-2">
      <span className={cn('grid shrink-0 place-items-center', box[size], className)}>
        <img src={LOGO_MARK} alt={withText ? '' : 'FitLife'} className="h-full w-full object-contain drop-shadow-[0_0_10px_rgba(34,197,94,0.35)]" />
      </span>
      {withText && (
        <span className={cn('font-display font-extrabold italic tracking-tight text-white', text[size])}>
          Fit<span className="bg-gradient-to-b from-lime-300 to-fit bg-clip-text text-transparent">Life</span>
        </span>
      )}
    </div>
  )
}
