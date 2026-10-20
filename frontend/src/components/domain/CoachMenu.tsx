import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, ChefHat, Crown, Lock, Plus } from 'lucide-react'
import type { MenuItem } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, Spinner, TypeIcon, mealTypeIcons } from '@/components/ui'
import { mealImage } from '@/data/images'
import { mealTypeLabels } from '@/utils/labels'
import { todayKey } from '@/utils/id'
import { cn } from '@/utils/cn'
import { isStaff } from '@/utils/roles'

function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

const order = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 }

/**
 * « Menu des coachs » : les aliments publiés depuis l'Espace Gestion.
 * Gratuit : le jour même. Premium : toute la semaine (menu hebdomadaire).
 */
export function CoachMenu({ loggedIds, onLog }: { loggedIds: string[]; onLog: (item: MenuItem) => Promise<void> }) {
  const { user } = useAuth()
  const today = todayKey()
  const days = Array.from({ length: 7 }, (_, i) => addDays(today, i))
  const [selected, setSelected] = useState(today)
  const [busy, setBusy] = useState<string | null>(null)
  const { data, loading } = useAsync(() => api.getMenu(days[0], days[6]), [today])
  const fullWeek = !!user?.isPremium || isStaff(user)

  const items = (data ?? []).filter((m) => m.date === selected).sort((a, b) => order[a.mealType] - order[b.mealType])
  const locked = !fullWeek && selected !== today

  return (
    <section>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-lg font-bold text-white">
          <ChefHat size={18} className="text-fit" /> Le menu de tes coachs
        </h2>
      </div>

      <div className="no-scrollbar -mx-1 mb-3 flex gap-2 overflow-x-auto px-1">
        {days.map((d) => {
          const date = new Date(`${d}T12:00:00Z`)
          const active = d === selected
          const dayLocked = !fullWeek && d !== today
          return (
            <button
              key={d}
              type="button"
              onClick={() => setSelected(d)}
              className={cn(
                'relative flex w-14 shrink-0 flex-col items-center rounded-2xl border py-2 transition',
                active ? 'border-fit bg-fit text-white shadow-fit' : 'border-white/10 bg-white/[0.03] text-white/60 hover:border-white/25',
              )}
            >
              <span className="text-[10px] font-semibold uppercase">
                {d === today ? 'Auj.' : date.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '')}
              </span>
              <span className="font-display text-lg font-extrabold leading-tight">
                {date.toLocaleDateString('fr-FR', { day: 'numeric', timeZone: 'UTC' })}
              </span>
              {dayLocked && <Lock size={10} className={cn('absolute right-1.5 top-1.5', active ? 'text-ink-900' : 'text-amber-300/70')} />}
            </button>
          )
        })}
      </div>

      {loading || !data ? (
        <Spinner />
      ) : locked ? (
        <Card className="flex flex-col items-center gap-3 border-amber-400/25 bg-amber-400/[0.05] py-8 text-center">
          <span className="grid h-12 w-12 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
            <Crown size={22} />
          </span>
          <div>
            <p className="font-bold text-white">Menu de la semaine réservé au Premium</p>
            <p className="mt-1 text-sm text-white/55">En gratuit, tu as accès au menu du jour. Passe Premium pour planifier toute ta semaine.</p>
          </div>
          <Link to="/premium">
            <Button variant="premium" size="sm" leftIcon={<Crown size={14} />}>
              Voir l’offre Premium
            </Button>
          </Link>
        </Card>
      ) : items.length === 0 ? (
        <Card className="text-center text-sm text-white/50">Les coachs n’ont pas encore publié le menu de ce jour.</Card>
      ) : (
        <div className="space-y-3">
          {items.map((m) => {
            const logged = loggedIds.includes(m.id)
            return (
              <Card key={m.id} padding="sm" className="flex gap-3">
                <img
                  src={mealImage({ name: m.name, type: m.mealType, imageUrl: m.imageUrl ?? undefined }, 200)}
                  alt={m.name}
                  loading="lazy"
                  className="h-20 w-20 shrink-0 rounded-2xl object-cover"
                />
                <div className="min-w-0 flex-1">
                  <p className="inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wide text-fit">
                    <TypeIcon icon={mealTypeIcons[m.mealType]} size={11} /> {mealTypeLabels[m.mealType]}
                  </p>
                  <h3 className="font-semibold text-white">{m.name}</h3>
                  {m.description && <p className="mt-0.5 text-xs leading-relaxed text-white/55">{m.description}</p>}
                  <div className="mt-1.5 flex flex-wrap gap-1.5 text-[11px]">
                    <span className="rounded-full bg-white/5 px-2 py-0.5 font-semibold text-white/85">{m.calories} kcal</span>
                    <span className="rounded-full bg-fit/10 px-2 py-0.5 text-fit-light">P {m.protein}g</span>
                    <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-sky-300">G {m.carbs}g</span>
                    <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-300">L {m.fat}g</span>
                  </div>
                  <p className="mt-1.5 text-[11px] text-white/35">Proposé par {m.createdBy}</p>
                </div>
                {selected === today && (
                  <Button
                    size="icon"
                    variant={logged ? 'secondary' : 'primary'}
                    disabled={logged}
                    loading={busy === m.id}
                    aria-label={logged ? 'Déjà ajouté' : 'Ajouter à mon journal'}
                    onClick={async () => {
                      setBusy(m.id)
                      try {
                        await onLog(m)
                      } finally {
                        setBusy(null)
                      }
                    }}
                    className="shrink-0 self-center"
                  >
                    {logged ? <Check size={18} /> : <Plus size={18} />}
                  </Button>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </section>
  )
}
