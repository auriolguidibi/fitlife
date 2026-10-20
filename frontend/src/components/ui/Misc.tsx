import type { ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-4 py-16 text-white/50">
      <div className="relative grid h-14 w-14 place-items-center">
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-fit/30" />
        <span className="relative grid h-14 w-14 place-items-center rounded-full border border-fit/30 bg-fit/10">
          <Loader2 className="animate-spin text-fit" size={24} />
        </span>
      </div>
      {label && <p className="text-sm font-medium">{label}</p>}
    </div>
  )
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode
  title: string
  description?: string
  action?: ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-white/10 py-12 text-center">
      {icon && <div className="text-white/30">{icon}</div>}
      <div>
        <p className="font-semibold text-white">{title}</p>
        {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`animate-pulse rounded-2xl bg-white/5 ${className}`} />
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string
  subtitle?: string
  action?: ReactNode
}) {
  return (
    <div className="mb-5 flex items-start justify-between gap-3">
      <div>
        <h1 className="text-2xl font-extrabold tracking-tight text-white">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-white/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
