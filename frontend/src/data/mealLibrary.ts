import type { Meal } from '@/types'

export interface MealTemplate extends Meal {
  cost: 'low' | 'medium' | 'high'
  tags: string[]
}

export const mealLibrary: MealTemplate[] = [
  {
    id: 'm_omelette',
    name: 'Omelette + légumes + fruit',
    type: 'breakfast',
    calories: 380,
    macros: { protein: 24, carbs: 30, fat: 18 },
    ingredients: ['Œufs', 'Tomates', 'Oignons', 'Poivron', 'Banane'],
    cost: 'low',
    tags: ['protéiné', 'rapide'],
  },
  {
    id: 'm_bouillie',
    name: 'Bouillie de mil + arachides',
    type: 'breakfast',
    calories: 340,
    macros: { protein: 12, carbs: 52, fat: 9 },
    ingredients: ['Mil', 'Lait', 'Arachides', 'Sucre'],
    cost: 'low',
    tags: ['énergétique'],
  },
  {
    id: 'm_pain_avocat',
    name: 'Pain complet + avocat + œuf',
    type: 'breakfast',
    calories: 410,
    macros: { protein: 16, carbs: 42, fat: 20 },
    ingredients: ['Pain complet', 'Avocat', 'Œuf', 'Citron'],
    cost: 'medium',
    tags: ['équilibré'],
  },
  {
    id: 'm_riz_poisson',
    name: 'Riz + poisson + légumes',
    type: 'lunch',
    calories: 620,
    macros: { protein: 38, carbs: 68, fat: 16 },
    ingredients: ['Riz', 'Poisson', 'Carottes', 'Haricots verts', 'Huile'],
    cost: 'medium',
    tags: ['équilibré', 'local'],
  },
  {
    id: 'm_poulet_attieke',
    name: 'Attiéké + poulet + sauce tomate',
    type: 'lunch',
    calories: 680,
    macros: { protein: 42, carbs: 74, fat: 18 },
    ingredients: ['Attiéké', 'Poulet', 'Tomates', 'Oignons', 'Épices'],
    cost: 'medium',
    tags: ['local', 'protéiné'],
  },
  {
    id: 'm_riz_haricot',
    name: 'Riz + haricots + plantain',
    type: 'lunch',
    calories: 590,
    macros: { protein: 22, carbs: 92, fat: 12 },
    ingredients: ['Riz', 'Haricots', 'Plantain', 'Huile de palme'],
    cost: 'low',
    tags: ['local', 'économique'],
  },
  {
    id: 'm_patate_oeufs',
    name: 'Patate douce + œufs + légumes',
    type: 'dinner',
    calories: 470,
    macros: { protein: 24, carbs: 58, fat: 14 },
    ingredients: ['Patate douce', 'Œufs', 'Épinards', 'Oignons'],
    cost: 'low',
    tags: ['local', 'équilibré'],
  },
  {
    id: 'm_poisson_grille',
    name: 'Poisson grillé + légumes sautés',
    type: 'dinner',
    calories: 430,
    macros: { protein: 40, carbs: 24, fat: 18 },
    ingredients: ['Poisson', 'Courgettes', 'Poivron', 'Ail', 'Citron'],
    cost: 'medium',
    tags: ['protéiné', 'léger'],
  },
  {
    id: 'm_soupe_légumes',
    name: 'Soupe de légumes + poulet',
    type: 'dinner',
    calories: 360,
    macros: { protein: 28, carbs: 34, fat: 10 },
    ingredients: ['Poulet', 'Carottes', 'Pommes de terre', 'Céleri'],
    cost: 'low',
    tags: ['léger', 'réconfortant'],
  },
  {
    id: 'm_banane_arachide',
    name: 'Banane + arachides',
    type: 'snack',
    calories: 260,
    macros: { protein: 8, carbs: 34, fat: 12 },
    ingredients: ['Banane', 'Arachides'],
    cost: 'low',
    tags: ['rapide', 'énergétique'],
  },
  {
    id: 'm_yaourt_fruit',
    name: 'Yaourt + fruits',
    type: 'snack',
    calories: 180,
    macros: { protein: 10, carbs: 26, fat: 4 },
    ingredients: ['Yaourt', 'Mangue', 'Papaye'],
    cost: 'low',
    tags: ['léger'],
  },
  {
    id: 'm_oeufs_mayo',
    name: 'Œufs durs + pain',
    type: 'snack',
    calories: 230,
    macros: { protein: 14, carbs: 20, fat: 10 },
    ingredients: ['Œufs', 'Pain', 'Sel', 'Poivre'],
    cost: 'low',
    tags: ['protéiné'],
  },
]


export function pickMeal(type: Meal['type'], restrictions: string[], budget: string): MealTemplate {
  let pool = mealLibrary.filter((m) => m.type === type)
  if (budget === 'low') pool = pool.filter((m) => m.cost !== 'high')
  const filtered = pool.filter(
    (m) => !m.ingredients.some((ing) => restrictions.some((r) => ing.toLowerCase().includes(r.toLowerCase()))),
  )
  const finalPool = filtered.length ? filtered : pool
  return finalPool[Math.floor(Math.random() * finalPool.length)]
}
