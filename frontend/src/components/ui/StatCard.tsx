import type { ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface StatCardProps {
  label: string
  value: ReactNode
  unit?: string
  icon?: ReactNode
  trend?: { value: string; positive?: boolean }
  className?: string
  accent?: boolean
}

export function StatCard({ label, value, unit, icon, trend, className, accent }: StatCardProps) {
  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-3xl p-4 transition hover:-translate-y-0.5',
        accent ? 'border border-fit/25 bg-gradient-to-br from-fit/25 via-ink-700 to-ink-800' : 'surface hover:border-white/10',
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-20 w-20 rounded-full bg-fit/10 opacity-0 blur-2xl transition group-hover:opacity-100" />
      <div className="flex items-center justify-between gap-2">
        <span className="truncate text-xs font-medium text-white/55">{label}</span>
        {icon && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-xl bg-fit/15 text-fit">{icon}</span>
        )}
      </div>
      <div className="mt-2.5 flex items-end gap-1">
        <span className="font-display text-2xl font-extrabold leading-none text-white">{value}</span>
        {unit && <span className="mb-0.5 text-xs font-medium text-white/50">{unit}</span>}
      </div>
      {trend && (
        <p
          className={cn(
            'mt-2 inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
            trend.positive ? 'bg-fit/15 text-fit' : 'bg-red-400/15 text-red-300',
          )}
        >
          {trend.value}
        </p>
      )}
    </div>
  )
}
