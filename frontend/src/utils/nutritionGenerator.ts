import type {
  DayMenu,
  GoalType,
  Macros,
  Meal,
  NutritionPlan,
  ShoppingItem,
  UserPreferences,
} from '@/types'
import { pickMeal, mealLibrary } from '@/data/mealLibrary'
import { uid, round } from './id'

const DAYS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']

const CALORIE_FACTOR: Record<GoalType, number> = {
  weight_loss: 0.82,
  muscle_gain: 1.15,
  endurance: 1.05,
  fitness: 1.0,
  wellness: 0.95,
}

interface NutritionInput {
  userId: string
  goal: GoalType
  dailyCalories: number
  preferences: UserPreferences
}

function macroSplit(goal: GoalType): Macros {
  switch (goal) {
    case 'muscle_gain':
      return { protein: 0.3, carbs: 0.45, fat: 0.25 }
    case 'weight_loss':
      return { protein: 0.35, carbs: 0.35, fat: 0.3 }
    case 'endurance':
      return { protein: 0.2, carbs: 0.55, fat: 0.25 }
    default:
      return { protein: 0.28, carbs: 0.45, fat: 0.27 }
  }
}

const CATEGORY_MAP: Record<string, string> = {
  Œufs: 'Protéines',
  Poulet: 'Protéines',
  Poisson: 'Protéines',
  Riz: 'Féculents',
  Attiéké: 'Féculents',
  Mil: 'Féculents',
  Haricots: 'Féculents',
  Pain: 'Féculents',
  'Pain complet': 'Féculents',
  Plantain: 'Féculents',
  'Patate douce': 'Féculents',
  'Pommes de terre': 'Féculents',
  Tomates: 'Légumes',
  Oignons: 'Légumes',
  Poivron: 'Légumes',
  Carottes: 'Légumes',
  Courgettes: 'Légumes',
  Épinards: 'Légumes',
  'Haricots verts': 'Légumes',
  Céleri: 'Légumes',
  Banane: 'Fruits',
  Mangue: 'Fruits',
  Papaye: 'Fruits',
  Avocat: 'Fruits',
  Lait: 'Laitiers',
  Yaourt: 'Laitiers',
  Arachides: 'Épicerie',
  Huile: 'Épicerie',
  'Huile de palme': 'Épicerie',
  Épices: 'Épicerie',
  Citron: 'Épicerie',
  Ail: 'Épicerie',
  Sucre: 'Épicerie',
  Sel: 'Épicerie',
  Poivre: 'Épicerie',
}

function categoryFor(ingredient: string): string {
  return CATEGORY_MAP[ingredient] ?? 'Autres'
}

function defaultQuantity(ingredient: string): string {
  const q: Record<string, string> = {
    Œufs: '12',
    Poulet: '1 kg',
    Poisson: '1 kg',
    Riz: '2 kg',
    Attiéké: '1 kg',
    Mil: '1 kg',
    Haricots: '1 kg',
    Pain: '1 paquet',
    'Pain complet': '1 paquet',
    Plantain: '1 régime',
    'Patate douce': '1 kg',
    'Pommes de terre': '1 kg',
    Tomates: '1 kg',
    Oignons: '500 g',
    Banane: '1 régime',
    Arachides: '500 g',
    Huile: '1 L',
    Lait: '1 L',
    Yaourt: '4 pots',
  }
  return q[ingredient] ?? '1'
}

export function generateNutritionPlan(input: NutritionInput): NutritionPlan {
  const { preferences } = input
  const restrictions = [...preferences.allergies, ...preferences.avoidedFoods]
  const targetCalories = Math.round(input.dailyCalories * CALORIE_FACTOR[input.goal])
  const split = macroSplit(input.goal)

  const mealsPerDay = preferences.mealsPerDay
  const mealTypes: Meal['type'][] =
    mealsPerDay >= 4
      ? ['breakfast', 'lunch', 'snack', 'dinner']
      : mealsPerDay === 3
        ? ['breakfast', 'lunch', 'dinner']
        : ['breakfast', 'dinner']

  const week: DayMenu[] = DAYS.map((day) => {
    const meals: Meal[] = mealTypes.map((type) => {
      const picked = pickMeal(type, restrictions, preferences.budget)
      return {
        id: uid('meal'),
        name: picked.name,
        type,
        emoji: picked.emoji,
        calories: picked.calories,
        macros: picked.macros,
        ingredients: picked.ingredients,
      }
    })
    return { day, meals }
  })

  const targetMacros: Macros = {
    protein: Math.round((targetCalories * split.protein) / 4),
    carbs: Math.round((targetCalories * split.carbs) / 4),
    fat: Math.round((targetCalories * split.fat) / 9),
  }

  return {
    id: uid('nut'),
    userId: input.userId,
    goal: input.goal,
    dailyCalories: targetCalories,
    targetMacros,
    week,
    hydrationTarget: round(input.dailyCalories > 2400 ? 3 : 2.5, 1),
  }
}

export function generateShoppingList(plan: NutritionPlan): ShoppingItem[] {
  const totals = new Map<string, { count: number; category: string }>()

  plan.week.forEach((day) => {
    day.meals.forEach((meal) => {
      meal.ingredients.forEach((ing) => {
        const existing = totals.get(ing)
        if (existing) existing.count += 1
        else totals.set(ing, { count: 1, category: categoryFor(ing) })
      })
    })
  })

  return Array.from(totals.entries())
    .map(([name, meta]) => ({
      id: uid('shop'),
      name,
      quantity: defaultQuantity(name),
      category: meta.category,
      checked: false,
    }))
    .sort((a, b) => a.category.localeCompare(b.category))
}

export function mealsForDay(plan: NutritionPlan, dayIndex: number): Meal[] {
  return plan.week[dayIndex % plan.week.length]?.meals ?? []
}

export function allMealTemplates(): Meal[] {
  return mealLibrary
}
