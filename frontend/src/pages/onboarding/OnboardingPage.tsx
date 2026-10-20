import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ArrowRight, Check } from 'lucide-react'
import type { Equipment, GoalType, Level, UserPreferences } from '@/types'
import { Button, Card, Input, Select } from '@/components/ui'
import { Logo } from '@/components/layout/Logo'
import { img } from '@/data/images'
import { useAuth } from '@/context/AuthContext'
import { goalLabels, equipmentLabels } from '@/utils/labels'
import { cn } from '@/utils/cn'
import type { LucideIcon } from 'lucide-react'
import { goalIcons } from '@/components/ui'

const TOTAL_STEPS = 6

// Un visuel par étape : objectif, niveau, jours, durée, matériel, nutrition.
const onboardingPhotos = [
  'photo-1631899477678-9d3c5aeded2d',
  'photo-1646938863839-4d49ded55765',
  'photo-1631899560971-394ded28a80f',
  'photo-1635863870541-286925d89030',
  'photo-1583454110551-21f2fa2afe61',
  'photo-1665332111329-dd9d7fa46c74',
].map((id) => img(id, 900, 400))

function OptionTile({
  active,
  onClick,
  icon: Icon,
  title,
  subtitle,
}: {
  active: boolean
  onClick: () => void
  icon?: LucideIcon
  title: string
  subtitle?: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition',
        active ? 'border-fit bg-fit/15 shadow-fit' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
      )}
    >
      {Icon && (
        <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl', active ? 'bg-fit text-white' : 'bg-white/[0.06] text-fit')}>
          <Icon size={19} />
        </span>
      )}
      <div className="flex-1">
        <p className="font-semibold text-white">{title}</p>
        {subtitle && <p className="text-xs text-white/50">{subtitle}</p>}
      </div>
      <span
        className={cn(
          'grid h-6 w-6 place-items-center rounded-full border transition',
          active ? 'border-fit bg-fit text-white' : 'border-white/20',
        )}
      >
        {active && <Check size={14} />}
      </span>
    </button>
  )
}

export function OnboardingPage() {
  const { preferences, savePreferences, user } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [saving, setSaving] = useState(false)

  const [prefs, setPrefs] = useState<UserPreferences>(
    preferences ?? {
      goal: 'weight_loss',
      level: 'beginner',
      daysPerWeek: 3,
      sessionMinutes: 30,
      equipment: ['none'],
      favoriteFoods: [],
      avoidedFoods: [],
      allergies: [],
      dietRestrictions: [],
      budget: 'medium',
      mealsPerDay: 3,
      onboarded: false,
    },
  )

  const update = (patch: Partial<UserPreferences>) => setPrefs((p) => ({ ...p, ...patch }))

  const toggleEquipment = (eq: Equipment) => {
    setPrefs((p) => {
      const has = p.equipment.includes(eq)
      const next = has ? p.equipment.filter((e) => e !== eq) : [...p.equipment.filter((e) => e !== 'none'), eq]
      return { ...p, equipment: next.length ? next : ['none'] }
    })
  }

  const finish = async () => {
    setSaving(true)
    try {
      await savePreferences({ ...prefs, onboarded: true })
      navigate('/', { replace: true })
    } finally {
      setSaving(false)
    }
  }

  const next = () => (step < TOTAL_STEPS ? setStep(step + 1) : finish())

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-900">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora -left-32 -top-32 h-[28rem] w-[28rem] bg-fit/30" />
        <div className="aurora aurora-2 bottom-[-10rem] right-0 h-[26rem] w-[26rem] bg-emerald-700/30" />
        <div className="auth-grid absolute inset-0" />
      </div>

      <div className="relative mx-auto flex min-h-screen max-w-lg flex-col px-4 py-6 sm:py-10">
        <div className="mb-5 flex items-center justify-between">
          <Logo size="sm" />
          <span className="rounded-full border border-white/10 bg-ink-800/70 px-3 py-1 text-xs font-semibold text-white/70 backdrop-blur">
            Étape {step} / {TOTAL_STEPS}
          </span>
        </div>

        <div className="glow-card flex flex-1 flex-col overflow-hidden rounded-[2rem] shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)]">
        <div className="relative h-36 overflow-hidden sm:h-44">
          {onboardingPhotos.map((src, i) => (
            <img
              key={src}
              src={src}
              alt=""
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-700',
                i === step - 1 ? 'kenburns opacity-100' : 'opacity-0',
              )}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-[#0e1d15] via-ink-900/30 to-transparent" />
          <button
            onClick={() => (step > 1 ? setStep(step - 1) : navigate(-1))}
            className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-ink-900/60 text-white/80 backdrop-blur-md hover:text-white"
            aria-label="Étape précédente"
          >
            <ArrowLeft size={18} />
          </button>
          <div className="absolute inset-x-5 bottom-3 flex gap-1.5">
            {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
              <span
                key={i}
                className={cn(
                  'h-1.5 flex-1 rounded-full transition-all duration-500',
                  i < step ? 'bg-fit shadow-[0_0_8px_rgba(34,197,94,0.7)]' : 'bg-white/20',
                )}
              />
            ))}
          </div>
        </div>

        <div className="flex flex-1 flex-col p-5 sm:p-7">
        <div key={step} className="rise flex-1">
          {step === 1 && (
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-white">Quel est ton objectif ?</h1>
              <p className="text-sm text-white/50">
                Nous personnaliserons ton programme et ton alimentation en fonction.
              </p>
              {(['weight_loss', 'muscle_gain', 'endurance', 'fitness', 'wellness'] as GoalType[]).map(
                (g) => (
                  <OptionTile
                    key={g}
                    active={prefs.goal === g}
                    onClick={() => update({ goal: g })}
                    icon={goalIcons[g]}
                    title={goalLabels[g]}
                  />
                ),
              )}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-white">Quel est ton niveau ?</h1>
              {(
                [
                  { value: 'beginner', title: 'Débutant', sub: 'Je débute ou je reprends' },
                  { value: 'intermediate', title: 'Intermédiaire', sub: 'Je m’entraîne régulièrement' },
                  { value: 'advanced', title: 'Avancé', sub: 'Je suis expérimenté' },
                ] as { value: Level; title: string; sub: string }[]
              ).map((l) => (
                <OptionTile
                  key={l.value}
                  active={prefs.level === l.value}
                  onClick={() => update({ level: l.value })}
                  title={l.title}
                  subtitle={l.sub}
                />
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-white">
                Combien de jours peux-tu t’entraîner ?
              </h1>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4, 5, 6, 7].map((d) => (
                  <button
                    key={d}
                    onClick={() => update({ daysPerWeek: d })}
                    className={cn(
                      'rounded-2xl border py-5 text-center transition',
                      prefs.daysPerWeek === d ? 'border-fit bg-fit/15 shadow-fit' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
                    )}
                  >
                    <p className="text-2xl font-extrabold text-white">{d}</p>
                    <p className="text-xs text-white/50">jours</p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {step === 4 && (
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-white">Durée moyenne disponible ?</h1>
              {[15, 30, 45, 60, 90].map((m) => (
                <OptionTile
                  key={m}
                  active={prefs.sessionMinutes === m}
                  onClick={() => update({ sessionMinutes: m })}
                  title={m === 90 ? '+60 min' : `${m} min`}
                />
              ))}
            </div>
          )}

          {step === 5 && (
            <div className="space-y-3">
              <h1 className="text-2xl font-extrabold text-white">Quel matériel possèdes-tu ?</h1>
              <p className="text-sm text-white/50">Sélectionne tout ce qui s’applique.</p>
              {(['none', 'dumbbells', 'bands', 'mat', 'machine', 'gym'] as Equipment[]).map((eq) => (
                <OptionTile
                  key={eq}
                  active={prefs.equipment.includes(eq)}
                  onClick={() => toggleEquipment(eq)}
                  title={equipmentLabels[eq]}
                />
              ))}
            </div>
          )}

          {step === 6 && (
            <div className="space-y-4">
              <h1 className="text-2xl font-extrabold text-white">Informations nutritionnelles</h1>
              <p className="-mt-2 text-sm text-white/50">
                Pour te proposer des aliments accessibles et adaptés à tes goûts.
              </p>
              <Input
                label="Aliments préférés (séparés par une virgule)"
                placeholder="Poulet, riz, banane"
                value={prefs.favoriteFoods.join(', ')}
                onChange={(e) =>
                  update({ favoriteFoods: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
              />
              <Input
                label="Aliments évités"
                placeholder="Poisson, arachides"
                value={prefs.avoidedFoods.join(', ')}
                onChange={(e) =>
                  update({ avoidedFoods: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
              />
              <Input
                label="Allergies"
                placeholder="Arachides, lactose"
                value={prefs.allergies.join(', ')}
                onChange={(e) =>
                  update({ allergies: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
              />
              <Input
                label="Restrictions alimentaires"
                placeholder="Sans porc, végétarien…"
                value={prefs.dietRestrictions.join(', ')}
                onChange={(e) =>
                  update({ dietRestrictions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })
                }
              />
              <div className="grid grid-cols-2 gap-3">
                <Select
                  label="Budget"
                  value={prefs.budget}
                  onChange={(e) => update({ budget: e.target.value as UserPreferences['budget'] })}
                  options={[
                    { value: 'low', label: 'Économique' },
                    { value: 'medium', label: 'Modéré' },
                    { value: 'high', label: 'Élevé' },
                  ]}
                />
                <Select
                  label="Repas / jour"
                  value={String(prefs.mealsPerDay)}
                  onChange={(e) => update({ mealsPerDay: Number(e.target.value) as UserPreferences['mealsPerDay'] })}
                  options={[
                    { value: '2', label: '2 repas' },
                    { value: '3', label: '3 repas' },
                    { value: '4', label: '4 repas' },
                    { value: '5', label: '5 repas' },
                  ]}
                />
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 space-y-3">
          {step === TOTAL_STEPS && user && (
            <Card variant="glass" padding="sm" className="text-center text-xs text-white/60">
              Ton programme personnalisé et ton programme alimentaire vont être générés à partir de tes
              réponses.
            </Card>
          )}
          <Button
            fullWidth
            size="lg"
            onClick={next}
            loading={saving}
            className="shine"
            rightIcon={step < TOTAL_STEPS ? <ArrowRight size={18} /> : <Check size={18} />}
          >
            {step < TOTAL_STEPS ? 'Continuer' : 'Générer mon programme'}
          </Button>
        </div>
        </div>
        </div>
      </div>
    </div>
  )
}
