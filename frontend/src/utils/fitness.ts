import type { Level } from '@/types'

export function calcBmi(weightKg: number, heightCm: number): number {
  const m = heightCm / 100
  if (m <= 0) return 0
  return Math.round((weightKg / (m * m)) * 10) / 10
}

export function bmiLabel(bmi: number): string {
  if (bmi < 18.5) return 'Insuffisance pondérale'
  if (bmi < 25) return 'Corpulence normale'
  if (bmi < 30) return 'Surpoids'
  return 'Obésité'
}

export function bmr(
  weightKg: number,
  heightCm: number,
  age: number,
  sex: 'male' | 'female' | 'other',
): number {
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age
  if (sex === 'male') return base + 5
  if (sex === 'female') return base - 161
  return base - 78
}

export function tdee(bmrValue: number, level: Level): number {
  const factors: Record<Level, number> = {
    beginner: 1.375,
    intermediate: 1.55,
    advanced: 1.725,
  }
  return Math.round(bmrValue * factors[level])
}

export function ageFromBirthDate(birthDate: string): number {
  const b = new Date(birthDate)
  const diff = Date.now() - b.getTime()
  return Math.floor(diff / (365.25 * 24 * 3600 * 1000))
}

export function caloriesFromActivity(
  distanceKm: number,
  weightKg: number,
  type: 'walk' | 'run' | 'bike' | 'other',
): number {
  const met: Record<string, number> = { walk: 3.8, run: 9.8, bike: 7.5, other: 5 }
  const speed = distanceKm > 0 ? distanceKm : 0.05
  const hours = type === 'bike' ? distanceKm / 20 : distanceKm / 8
  const effectiveHours = Math.max(hours, speed * 0.05)
  return Math.round(met[type] * weightKg * effectiveHours)
}

export function estimateStepsFromDistance(distanceKm: number): number {
  return Math.round((distanceKm * 1000) / 0.75)
}

export function distanceFromSteps(steps: number): number {
  return Math.round(((steps * 0.75) / 1000) * 100) / 100
}
