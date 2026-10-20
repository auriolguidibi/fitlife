import { useState } from 'react'
import { cn } from '@/utils/cn'
import { portraitFor } from '@/data/images'
import { serverUrl } from '@/utils/apiUrl'

function initials(name: string): string {
  return name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0]?.toUpperCase())
    .join('')
}

interface AvatarProps {
  name: string
  src?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  ring?: boolean
  online?: boolean
  className?: string
}

const sizes = {
  xs: 'h-7 w-7 text-[10px]',
  sm: 'h-9 w-9 text-xs',
  md: 'h-11 w-11 text-sm',
  lg: 'h-14 w-14 text-base',
  xl: 'h-20 w-20 text-xl',
}

export function Avatar({ name, src, size = 'md', ring, online, className }: AvatarProps) {
  const [failed, setFailed] = useState(false)
  // Sans photo fournie, on retrouve le portrait du coach / membre par son nom.
  const photo = failed ? undefined : (serverUrl(src) ?? portraitFor(name, size === 'lg' || size === 'xl' ? 240 : 120))

  return (
    <div className={cn('relative shrink-0', sizes[size], className)}>
      <div
        className={cn(
          'grid h-full w-full place-items-center overflow-hidden rounded-full bg-gradient-to-br from-fit to-fit-dark font-bold text-white',
          ring && 'ring-2 ring-fit ring-offset-2 ring-offset-ink-900',
        )}
      >
        {photo ? (
          <img
            src={photo}
            alt={name}
            loading="lazy"
            onError={() => setFailed(true)}
            className="h-full w-full object-cover"
          />
        ) : (
          initials(name) || '?'
        )}
      </div>
      {online && (
        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-ink-800 bg-fit" />
      )}
    </div>
  )
}

/** Petite pile d'avatars qui se chevauchent (« ils s'entraînent avec toi »). */
export function AvatarStack({ names, max = 4, className }: { names: string[]; max?: number; className?: string }) {
  return (
    <div className={cn('flex -space-x-2.5', className)}>
      {names.slice(0, max).map((n) => (
        <Avatar key={n} name={n} size="xs" className="rounded-full ring-2 ring-ink-700" />
      ))}
    </div>
  )
}
