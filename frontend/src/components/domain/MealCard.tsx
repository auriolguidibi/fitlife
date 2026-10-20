import { Check, Plus } from 'lucide-react'
import type { Meal } from '@/types'
import { Button, Card } from '@/components/ui'
import { mealTypeLabels } from '@/utils/labels'
import { mealImage } from '@/data/images'

interface MealCardProps {
  meal: Meal
  onAdd?: (meal: Meal) => void
  added?: boolean
}

export function MealCard({ meal, onAdd, added }: MealCardProps) {
  return (
    <Card padding="sm" className="flex items-center gap-3 transition hover:border-white/10">
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-2xl bg-ink-800">
        <img src={mealImage(meal, 200)} alt={meal.name} loading="lazy" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wide text-fit">
          {mealTypeLabels[meal.type]}
        </p>
        <h3 className="truncate font-semibold text-white">{meal.name}</h3>
        <div className="mt-1 flex flex-wrap gap-1.5 text-[11px] text-white/60">
          <span className="rounded-full bg-white/5 px-2 py-0.5 font-semibold text-white/85">{meal.calories} kcal</span>
          <span className="rounded-full bg-fit/10 px-2 py-0.5 text-fit-light">P {meal.macros.protein}g</span>
          <span className="rounded-full bg-sky-400/10 px-2 py-0.5 text-sky-300">G {meal.macros.carbs}g</span>
          <span className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-300">L {meal.macros.fat}g</span>
        </div>
      </div>
      {onAdd && (
        <Button
          size="icon"
          variant={added ? 'secondary' : 'primary'}
          onClick={() => onAdd(meal)}
          disabled={added}
          aria-label="Ajouter le repas"
        >
          {added ? <Check size={18} /> : <Plus size={18} />}
        </Button>
      )}
    </Card>
  )
}
