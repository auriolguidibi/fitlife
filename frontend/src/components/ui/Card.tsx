import type { HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'glass' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  children: ReactNode
}

export function Card({ variant = 'default', padding = 'md', className, children, ...props }: CardProps) {
  const variants = {
    default: 'surface',
    elevated: 'surface shadow-card',
    glass: 'glass',
    gradient:
      'bg-gradient-to-br from-fit/20 via-ink-700 to-ink-800 border border-fit/20 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]',
  }
  const paddings = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' }
  return (
    <div
      className={cn('rounded-3xl', variants[variant], paddings[padding], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function CardHeader({
  title,
  subtitle,
  action,
  className,
}: {
  title: ReactNode
  subtitle?: ReactNode
  action?: ReactNode
  className?: string
}) {
  return (
    <div className={cn('mb-3 flex items-center justify-between gap-3', className)}>
      <div>
        <h3 className="font-display text-base font-bold text-white">{title}</h3>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
      {action}
    </div>
  )
}
