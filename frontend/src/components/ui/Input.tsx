import { forwardRef, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from 'react'
import { cn } from '@/utils/cn'

const fieldStyles =
  'w-full rounded-2xl bg-ink-800 border border-white/10 px-4 text-white placeholder:text-white/30 outline-none transition focus:border-fit/60 focus:ring-2 focus:ring-fit/20'

interface FieldWrapperProps {
  label?: string
  error?: string
  hint?: ReactNode
  children: ReactNode
}

function FieldWrapper({ label, error, hint, children }: FieldWrapperProps) {
  return (
    <div className="w-full">
      {label && <label className="mb-1.5 block text-sm font-medium text-white/80">{label}</label>}
      {children}
      {error ? (
        <p className="mt-1 text-xs text-red-400">{error}</p>
      ) : hint ? (
        <p className="mt-1 text-xs text-white/40">{hint}</p>
      ) : null}
    </div>
  )
}

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: ReactNode
  leftIcon?: ReactNode
  rightIcon?: ReactNode
}

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, error, hint, leftIcon, rightIcon, className, ...props },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error} hint={hint}>
      <div className="relative">
        {leftIcon && (
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-white/40">
            {leftIcon}
          </span>
        )}
        <input
          ref={ref}
          className={cn(
            fieldStyles,
            'h-12',
            leftIcon ? 'pl-11' : '',
            rightIcon ? 'pr-11' : '',
            error && 'border-red-500/60',
            className,
          )}
          {...props}
        />
        {rightIcon && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40">{rightIcon}</span>
        )}
      </div>
    </FieldWrapper>
  )
})

/** Champ mot de passe avec bouton afficher / masquer. */
export const PasswordInput = forwardRef<HTMLInputElement, Omit<InputProps, 'type' | 'rightIcon'>>(
  function PasswordInput(props, ref) {
    const [visible, setVisible] = useState(false)
    return (
      <Input
        ref={ref}
        {...props}
        type={visible ? 'text' : 'password'}
        rightIcon={
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            className="grid h-8 w-8 place-items-center rounded-full text-white/40 transition hover:bg-white/5 hover:text-white"
            aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
          >
            {visible ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        }
      />
    )
  },
)

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string
  error?: string
  options: { value: string; label: string }[]
}

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, error, options, className, ...props },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error}>
      <select ref={ref} className={cn(fieldStyles, 'h-12 appearance-none', className)} {...props}>
        {options.map((o) => (
          <option key={o.value} value={o.value} className="bg-ink-800">
            {o.label}
          </option>
        ))}
      </select>
    </FieldWrapper>
  )
})

interface TextareaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string
  error?: string
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, error, className, ...props },
  ref,
) {
  return (
    <FieldWrapper label={label} error={error}>
      <textarea ref={ref} className={cn(fieldStyles, 'py-3 min-h-[96px] resize-none', className)} {...props} />
    </FieldWrapper>
  )
})
