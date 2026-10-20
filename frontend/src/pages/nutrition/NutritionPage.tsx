import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Apple, Droplets, Plus, ShoppingCart, Trash2 } from 'lucide-react'
import type { Meal, MealLogEntry, MenuItem } from '@/types'
import { CoachMenu } from '@/components/domain/CoachMenu'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Avatar, Button, Card, Modal, ProgressBar, ProgressRing, Spinner } from '@/components/ui'
import { heroImages } from '@/data/images'
import { MealCard } from '@/components/domain/MealCard'
import { mealTypeLabels } from '@/utils/labels'
import { formatNumber } from '@/utils/format'
import { todayKey } from '@/utils/id'

export function NutritionPage() {
  const date = todayKey()
  const { data, loading } = useAsync(async () => {
    const [plan, logs] = await Promise.all([api.getNutritionPlan(), api.getMealLogs(date)])
    return { plan, logs }
  }, [date])
  const [logs, setLogs] = useState<MealLogEntry[] | null>(null)
  const [modalOpen, setModalOpen] = useState(false)
  const [saving, setSaving] = useState(false)

  if (loading || !data) return <Spinner label="Chargement de ton alimentation…" />

  const plan = data.plan
  const entries = logs ?? data.logs
  const dayIndex = (new Date().getDay() + 6) % 7
  const todayMenu = plan.week[dayIndex]?.meals ?? []

  const consumed = entries.reduce(
    (acc, e) => ({
      calories: acc.calories + e.calories,
      protein: acc.protein + e.macros.protein,
      carbs: acc.carbs + e.macros.carbs,
      fat: acc.fat + e.macros.fat,
    }),
    { calories: 0, protein: 0, carbs: 0, fat: 0 },
  )

  const addMeal = async (meal: Meal) => {
    setSaving(true)
    try {
      const entry = await api.logMeal({
        date,
        mealId: meal.id,
        name: meal.name,
        type: meal.type,
        calories: meal.calories,
        macros: meal.macros,
      })
      setLogs([...entries, entry])
    } finally {
      setSaving(false)
      setModalOpen(false)
    }
  }

  const addMenuItem = async (item: MenuItem) => {
    const entry = await api.logMeal({
      date,
      mealId: item.id,
      name: item.name,
      type: item.mealType,
      calories: item.calories,
      macros: { protein: item.protein, carbs: item.carbs, fat: item.fat },
    })
    setLogs([...entries, entry])
  }

  const remove = async (id: string) => {
    await api.removeMealLog(id)
    setLogs(entries.filter((e) => e.id !== id))
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <header className="relative overflow-hidden rounded-[2rem] border border-white/5">
        <img src={heroImages.nutrition} alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/80 to-ink-900/20" />
        <div className="relative flex items-center gap-4 p-5 sm:p-7">
          <div className="min-w-0 flex-1">
            <h1 className="text-2xl font-extrabold text-white sm:text-3xl">Mon alimentation</h1>
            <p className="mt-1 text-sm text-white/70">
              {plan.dailyCalories} kcal recommandées · {mealTypeLabels.breakfast} → {mealTypeLabels.dinner}
            </p>
            <p className="mt-3 max-w-sm text-xs leading-relaxed text-white/55">
              Des plats d’ici, des portions pensées pour ton objectif. Manger sainement sans renoncer au goût.
            </p>
          </div>
          <Avatar name="Coach Amina" size="lg" ring className="hidden sm:block" />
        </div>
      </header>

      <Card variant="gradient">
        <div className="flex items-center gap-5">
          <ProgressRing value={consumed.calories} max={plan.dailyCalories} size={110} stroke={10}>
            <div className="text-center">
              <p className="text-xl font-extrabold text-white">{formatNumber(consumed.calories)}</p>
              <p className="text-[10px] text-white/50">/ {formatNumber(plan.dailyCalories)} kcal</p>
            </div>
          </ProgressRing>
          <div className="flex-1 space-y-3">
            <MacroBar label="Protéines" value={consumed.protein} target={plan.targetMacros.protein} color="bg-fit" />
            <MacroBar label="Glucides" value={consumed.carbs} target={plan.targetMacros.carbs} color="bg-sky-400" />
            <MacroBar label="Lipides" value={consumed.fat} target={plan.targetMacros.fat} color="bg-amber-400" />
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Link to="/nutrition/shopping">
          <Card className="flex h-full items-center gap-3">
            <ShoppingCart className="text-fit" size={20} />
            <span className="text-sm font-semibold text-white">Liste de courses</span>
          </Card>
        </Link>
        <Link to="/hydration">
          <Card className="flex h-full items-center gap-3">
            <Droplets className="text-sky-400" size={20} />
            <span className="text-sm font-semibold text-white">Hydratation</span>
          </Card>
        </Link>
      </div>

      <CoachMenu loggedIds={entries.map((e) => e.mealId ?? '')} onLog={addMenuItem} />

      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-bold text-white">
            <Apple size={18} className="text-fit" /> Repas du jour
          </h2>
          <Button size="sm" onClick={() => setModalOpen(true)} leftIcon={<Plus size={16} />}>
            Ajouter
          </Button>
        </div>
        <div className="space-y-3">
          {todayMenu.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              added={entries.some((e) => e.mealId === meal.id)}
              onAdd={addMeal}
            />
          ))}
        </div>
      </section>

      <section>
        <h2 className="mb-3 text-lg font-bold text-white">Repas enregistrés ({entries.length})</h2>
        {entries.length === 0 ? (
          <Card className="text-center text-sm text-white/50">
            Aucun repas enregistré aujourd’hui. Ajoute un repas pour suivre tes calories.
          </Card>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <Card key={e.id} className="flex items-center gap-3" padding="sm">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-white">{e.name}</p>
                  <p className="text-xs text-white/50">
                    {mealTypeLabels[e.type]} · {e.calories} kcal · P{e.macros.protein} G{e.macros.carbs} L{e.macros.fat}
                  </p>
                </div>
                <button
                  onClick={() => remove(e.id)}
                  className="grid h-9 w-9 place-items-center rounded-full text-red-400/80 hover:bg-red-500/10"
                >
                  <Trash2 size={16} />
                </button>
              </Card>
            ))}
          </div>
        )}
      </section>

      <Modal open={modalOpen} onClose={() => setModalOpen(false)} title="Ajouter un repas">
        <div className="space-y-3">
          {todayMenu.map((meal) => (
            <MealCard
              key={meal.id}
              meal={meal}
              added={entries.some((e) => e.mealId === meal.id)}
              onAdd={addMeal}
            />
          ))}
          {saving && <p className="text-center text-xs text-white/50">Enregistrement…</p>}
        </div>
      </Modal>
    </div>
  )
}

function MacroBar({ label, value, target, color }: { label: string; value: number; target: number; color: string }) {
  return (
    <div>
      <div className="mb-1 flex justify-between text-xs">
        <span className="text-white/60">{label}</span>
        <span className="font-semibold text-white">
          {Math.round(value)} / {target} g
        </span>
      </div>
      <ProgressBar value={value} max={target} size="sm" color={color} />
    </div>
  )
}
