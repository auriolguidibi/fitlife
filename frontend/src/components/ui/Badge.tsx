import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Tone = 'fit' | 'amber' | 'blue' | 'purple' | 'red' | 'gray' | 'outline'

const tones: Record<Tone, string> = {
  fit: 'bg-fit/15 text-fit border-fit/25',
  amber: 'bg-amber-400/15 text-amber-300 border-amber-400/25',
  blue: 'bg-sky-400/15 text-sky-300 border-sky-400/25',
  purple: 'bg-violet-400/15 text-violet-300 border-violet-400/25',
  red: 'bg-red-400/15 text-red-300 border-red-400/25',
  gray: 'bg-white/8 text-white/70 border-white/10',
  outline: 'bg-transparent text-white/70 border-white/15',
}

export function Badge({
  children,
  tone = 'fit',
  className,
  dot,
}: {
  children: ReactNode
  tone?: Tone
  className?: string
  dot?: boolean
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold',
        tones[tone],
        className,
      )}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {children}
    </span>
  )
}

export function Chip({
  children,
  active,
  onClick,
  className,
}: {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  className?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition',
        active
          ? 'border-fit bg-fit text-white'
          : 'border-white/10 bg-ink-700 text-white/70 hover:border-white/20',
        className,
      )}
    >
      {children}
    </button>
  )
}
