import { cn } from '@/utils/cn'

interface Tab<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  tabs: Tab<T>[]
  value: T
  onChange: (value: T) => void
  className?: string
  variant?: 'pill' | 'underline'
}

export function Tabs<T extends string>({ tabs, value, onChange, className, variant = 'pill' }: TabsProps<T>) {
  if (variant === 'underline') {
    return (
      <div className={cn('flex gap-1 overflow-x-auto no-scrollbar border-b border-white/10', className)}>
        {tabs.map((t) => (
          <button
            key={t.value}
            onClick={() => onChange(t.value)}
            className={cn(
              'relative shrink-0 px-4 py-3 text-sm font-semibold transition',
              value === t.value ? 'text-white' : 'text-white/45 hover:text-white/70',
            )}
          >
            <span className="flex items-center gap-2">
              {t.icon}
              {t.label}
              {typeof t.count === 'number' && (
                <span className="rounded-full bg-white/10 px-1.5 text-[10px]">{t.count}</span>
              )}
            </span>
            {value === t.value && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-fit" />}
          </button>
        ))}
      </div>
    )
  }

  // Téléphone : tous les onglets restent visibles (2 par ligne au-delà de 3), jamais coupés au bord.
  const many = tabs.length > 3
  return (
    <div
      className={cn(
        'flex flex-wrap gap-1 rounded-2xl border border-white/[0.06] bg-ink-800/80 p-1 backdrop-blur sm:flex-nowrap',
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.value}
          onClick={() => onChange(t.value)}
          className={cn(
            'flex min-w-0 grow items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-semibold transition-all duration-300 sm:basis-0 sm:gap-2 sm:px-3 sm:text-sm',
            many ? 'basis-[calc(50%-2px)]' : 'basis-0',
            value === t.value
              ? 'bg-gradient-to-b from-fit to-fit-dark text-white shadow-fit'
              : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
          )}
        >
          {t.icon && <span className={cn('shrink-0', many && 'hidden sm:inline')}>{t.icon}</span>}
          <span className="truncate">{t.label}</span>
          {typeof t.count === 'number' && (
            <span
              className={cn(
                'shrink-0 rounded-full px-1.5 text-[10px]',
                value === t.value ? 'bg-ink-900/20' : 'bg-white/10',
              )}
            >
              {t.count}
            </span>
          )}
        </button>
      ))}
    </div>
  )
}

export function Segmented<T extends string>({
  options,
  value,
  onChange,
  className,
}: {
  options: { value: T; label: string }[]
  value: T
  onChange: (v: T) => void
  className?: string
}) {
  return <Tabs tabs={options} value={value} onChange={onChange} className={className} />
}
