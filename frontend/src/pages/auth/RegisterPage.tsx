import { useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Camera, Check, Lock, Mail, Gauge, Phone, User as UserIcon } from 'lucide-react'
import { api } from '@/services'
import { squareResize } from '@/utils/image'
import type { Sex } from '@/types'
import { Button, Input, PasswordInput } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

const steps = ['Toi', 'Ton compte', 'Ton corps']

function passwordScore(p: string): number {
  let s = 0
  if (p.length >= 6) s++
  if (p.length >= 10) s++
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++
  if (/\d/.test(p) || /[^A-Za-z0-9]/.test(p)) s++
  return s
}

const strength = [
  { label: 'Trop court', color: 'bg-red-500', text: 'text-red-400' },
  { label: 'Faible', color: 'bg-orange-500', text: 'text-orange-400' },
  { label: 'Correct', color: 'bg-amber-400', text: 'text-amber-300' },
  { label: 'Solide', color: 'bg-lime-400', text: 'text-lime-300' },
  { label: 'Excellent', color: 'bg-fit', text: 'text-fit' },
]

const sexOptions: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Femme' },
  { value: 'male', label: 'Homme' },
  { value: 'other', label: 'Autre' },
]

export function RegisterPage() {
  const { register, setUser } = useAuth()
  const photoInput = useRef<HTMLInputElement>(null)
  const [photo, setPhoto] = useState<{ blob: Blob; dataUrl: string } | null>(null)
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [form, setForm] = useState({
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    password: '',
    birthDate: '1995-01-01',
    sex: 'female' as Sex,
    height: 170,
    weight: 70,
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const set = <K extends keyof typeof form>(key: K, value: (typeof form)[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  const score = passwordScore(form.password)
  const bmi = form.weight / (form.height / 100) ** 2

  const validate = (s: number): string => {
    if (s === 0 && (!form.firstName.trim() || !form.lastName.trim())) return 'Dis-nous comment tu t’appelles.'
    if (s === 1) {
      if (!/^\S+@\S+\.\S+$/.test(form.email)) return 'Cet email ne semble pas valide.'
      if (form.password.length < 8) return 'Le mot de passe doit contenir au moins 8 caractères.'
    }
    return ''
  }

  const next = async (e: React.FormEvent) => {
    e.preventDefault()
    const msg = validate(step)
    setError(msg)
    if (msg) return
    if (step < steps.length - 1) {
      setStep(step + 1)
      return
    }
    setLoading(true)
    try {
      await register({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone,
        password: form.password,
        birthDate: form.birthDate,
        sex: form.sex,
        height: Number(form.height),
        weight: Number(form.weight),
      })
      if (photo) {
        // La photo n'empêche pas l'inscription : en cas d'échec, elle pourra être ajoutée depuis le profil.
        try {
          setUser(await api.uploadAvatar(photo.blob))
        } catch {
          /* ignoré */
        }
      }
      navigate('/onboarding', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Inscription impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-white">
        {step === 0 && 'Commençons par toi'}
        {step === 1 && `Enchanté·e ${form.firstName} !`}
        {step === 2 && 'Dernière ligne droite'}
      </h1>
      <p className="mt-2 text-sm text-white/55">
        {step === 0 && 'Moins d’une minute pour créer ton espace. Ton coach s’occupe du reste.'}
        {step === 1 && 'Tes identifiants pour retrouver ton programme sur tous tes appareils.'}
        {step === 2 && 'Ces infos servent à calibrer ton programme et ton plan nutrition.'}
      </p>

      {/* Stepper */}
      <ol className="mt-6 flex items-center gap-2">
        {steps.map((label, i) => (
          <li key={label} className="flex flex-1 flex-col gap-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-fit transition-all duration-500"
                style={{ width: i < step ? '100%' : i === step ? '50%' : '0%' }}
              />
            </div>
            <span
              className={cn(
                'inline-flex items-center gap-1 text-[11px] font-semibold',
                i <= step ? 'text-white/85' : 'text-white/30',
              )}
            >
              {i < step ? <Check size={11} className="text-fit" strokeWidth={3} /> : <span>{i + 1}.</span>}
              {label}
            </span>
          </li>
        ))}
      </ol>

      <form onSubmit={next} className="mt-6">
        <div key={step} className="rise space-y-4">
          {step === 0 && (
            <>
              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={() => photoInput.current?.click()}
                  className="group relative grid h-20 w-20 shrink-0 place-items-center overflow-hidden rounded-full border-2 border-dashed border-white/20 bg-white/[0.03] transition hover:border-fit"
                  aria-label="Ajouter une photo de profil"
                >
                  {photo ? (
                    <img src={photo.dataUrl} alt="Ta photo" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={24} className="text-white/40 transition group-hover:text-fit" />
                  )}
                  <span className="absolute bottom-0 right-0 grid h-7 w-7 place-items-center rounded-full bg-fit text-white">
                    <Camera size={13} />
                  </span>
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-white">{photo ? 'Belle photo !' : 'Ta photo de profil'}</p>
                  <p className="text-xs text-white/45">
                    Facultatif · elle aide les coachs et les membres à te reconnaître.
                  </p>
                </div>
                <input
                  ref={photoInput}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0]
                    e.target.value = ''
                    if (!file) return
                    try {
                      setPhoto(await squareResize(file, 512))
                      setError('')
                    } catch (err) {
                      setError(err instanceof Error ? err.message : 'Image illisible')
                    }
                  }}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Prénom"
                  placeholder="Fatou"
                  leftIcon={<UserIcon size={16} />}
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  autoFocus
                />
                <Input
                  label="Nom"
                  placeholder="Koné"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                />
              </div>
              <div>
                <p className="mb-1.5 text-sm font-medium text-white/80">Tu es…</p>
                <div className="grid grid-cols-3 gap-2.5">
                  {sexOptions.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set('sex', o.value)}
                      className={cn(
                        'flex flex-col items-center gap-2 rounded-2xl border py-3.5 text-sm font-semibold transition',
                        form.sex === o.value
                          ? 'border-fit bg-fit/15 text-white shadow-fit'
                          : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25 hover:text-white',
                      )}
                    >
                      <span
                        className={cn(
                          'grid h-5 w-5 place-items-center rounded-full border-2 transition',
                          form.sex === o.value ? 'border-fit bg-fit text-white' : 'border-white/25',
                        )}
                      >
                        {form.sex === o.value && <Check size={11} strokeWidth={3.5} />}
                      </span>
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <Input
                label="Date de naissance"
                type="date"
                value={form.birthDate}
                onChange={(e) => set('birthDate', e.target.value)}
              />
            </>
          )}

          {step === 1 && (
            <>
              <Input
                label="Email"
                type="email"
                autoComplete="email"
                placeholder="ton.email@exemple.com"
                leftIcon={<Mail size={16} />}
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                autoFocus
              />
              <Input
                label="Téléphone"
                type="tel"
                placeholder="+225 07 00 00 00"
                leftIcon={<Phone size={16} />}
                hint="Facultatif · pour les rappels de séance"
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
              />
              <div>
                <PasswordInput
                  label="Mot de passe"
                  autoComplete="new-password"
                  placeholder="8 caractères minimum"
                  leftIcon={<Lock size={16} />}
                  value={form.password}
                  onChange={(e) => set('password', e.target.value)}
                />
                {form.password && (
                  <div className="mt-2">
                    <div className="grid grid-cols-4 gap-1.5">
                      {[1, 2, 3, 4].map((n) => (
                        <span
                          key={n}
                          className={cn(
                            'h-1 rounded-full transition-colors duration-300',
                            score >= n ? strength[score].color : 'bg-white/10',
                          )}
                        />
                      ))}
                    </div>
                    <p className={cn('mt-1 text-[11px] font-semibold', strength[score].text)}>
                      {strength[score].label}
                    </p>
                  </div>
                )}
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <RangeField
                label="Taille"
                unit="cm"
                min={120}
                max={220}
                value={form.height}
                onChange={(v) => set('height', v)}
              />
              <RangeField
                label="Poids"
                unit="kg"
                min={35}
                max={180}
                value={form.weight}
                onChange={(v) => set('weight', v)}
              />
              <div className="flex items-center gap-3 rounded-2xl border border-fit/20 bg-fit/10 p-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fit/20 text-fit">
                  <Gauge size={18} />
                </span>
                <p className="text-xs leading-relaxed text-white/75">
                  IMC estimé <b className="text-white">{bmi.toFixed(1).replace('.', ',')}</b>. Ton coach va
                  construire un programme de 8 semaines à partir de ces infos.
                </p>
              </div>
            </>
          )}
        </div>

        {error && (
          <p className="mt-4 rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <div className="mt-6 flex gap-3">
          {step > 0 && (
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="w-14 shrink-0 px-0"
              onClick={() => {
                setError('')
                setStep(step - 1)
              }}
              aria-label="Étape précédente"
            >
              <ArrowLeft size={18} />
            </Button>
          )}
          <Button
            type="submit"
            fullWidth
            size="lg"
            loading={loading}
            className="shine group"
            rightIcon={<ArrowRight size={18} className="transition group-hover:translate-x-1" />}
          >
            {step < steps.length - 1 ? 'Continuer' : 'Créer mon compte'}
          </Button>
        </div>
      </form>

      <p className="mt-5 text-center text-[11px] leading-relaxed text-white/35">
        En créant un compte, tu acceptes que FitLife t’accompagne dans ta remise en forme. FitLife ne remplace
        pas un avis médical.
      </p>

      <p className="mt-4 text-center text-sm text-white/50">
        Déjà membre ?{' '}
        <Link to="/login" className="font-semibold text-fit hover:underline">
          Se connecter
        </Link>
      </p>
    </div>
  )
}

function RangeField({
  label,
  unit,
  min,
  max,
  value,
  onChange,
}: {
  label: string
  unit: string
  min: number
  max: number
  value: number
  onChange: (v: number) => void
}) {
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div className="rounded-2xl border border-white/10 bg-ink-800/70 p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-sm font-medium text-white/80">{label}</span>
        <span className="font-display text-2xl font-extrabold text-white">
          {value}
          <span className="ml-1 text-xs font-semibold text-white/50">{unit}</span>
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-3 h-2 w-full rounded-full"
        style={{ background: `linear-gradient(90deg, #22c55e ${pct}%, rgba(255,255,255,0.1) ${pct}%)` }}
      />
      <div className="mt-1 flex justify-between text-[10px] text-white/30">
        <span>
          {min} {unit}
        </span>
        <span>
          {max} {unit}
        </span>
      </div>
    </div>
  )
}
