import { forwardRef } from 'react'
import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { cn } from '@/utils/cn'

type Variant = 'primary' | 'secondary' | 'ghost' | 'outline' | 'danger' | 'premium'
type Size = 'sm' | 'md' | 'lg' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  fullWidth?: boolean
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

const variants: Record<Variant, string> = {
  primary: 'bg-fit text-white hover:bg-fit-dark font-semibold shadow-fit',
  secondary: 'bg-ink-600 text-white hover:bg-ink-500',
  ghost: 'bg-transparent text-white hover:bg-white/5',
  outline: 'bg-transparent text-white border border-white/15 hover:bg-white/5',
  danger: 'bg-red-500/90 text-white hover:bg-red-500',
  premium: 'bg-gradient-to-r from-amber-300 to-amber-500 text-ink-900 font-bold hover:from-amber-200 hover:to-amber-400',
}

const sizes: Record<Size, string> = {
  sm: 'h-9 px-3.5 text-sm rounded-xl gap-1.5',
  md: 'h-11 px-5 text-sm rounded-2xl gap-2',
  lg: 'h-14 px-6 text-base rounded-2xl gap-2',
  icon: 'h-11 w-11 rounded-2xl justify-center',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'md', loading, fullWidth, leftIcon, rightIcon, className, children, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center transition-all active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none select-none',
        variants[variant],
        sizes[size],
        fullWidth && 'w-full',
        className,
      )}
      {...props}
    >
      {loading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : (
        leftIcon
      )}
      {children}
      {!loading && rightIcon}
    </button>
  )
})
