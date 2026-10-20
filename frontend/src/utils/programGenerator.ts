import type {
  Equipment,
  GoalType,
  Level,
  WeeklyPlan,
  Workout,
  WorkoutProgram,
} from '@/types'
import { pickExercises } from '@/data/exerciseLibrary'
import { uid } from './id'

interface ProgramInput {
  userId: string
  goal: GoalType
  level: Level
  daysPerWeek: number
  sessionMinutes: number
  equipment: Equipment[]
}

const WORKOUT_META: Record<
  Workout['type'],
  { name: string; bodyPart: string; equipment: Equipment[] }
> = {
  full_body: { name: 'Full Body', bodyPart: 'full', equipment: [] },
  cardio: { name: 'Cardio', bodyPart: 'cardio', equipment: [] },
  legs: { name: 'Jambes', bodyPart: 'lower', equipment: [] },
  abs: { name: 'Abdominaux', bodyPart: 'core', equipment: ['mat'] },
  upper_body: { name: 'Haut du corps', bodyPart: 'upper', equipment: ['dumbbells'] },
  mobility: { name: 'Mobilité', bodyPart: 'mobility', equipment: ['mat'] },
}

function typeRotation(goal: GoalType, daysPerWeek: number): Workout['type'][] {
  const base: Workout['type'][] =
    goal === 'muscle_gain'
      ? ['full_body', 'upper_body', 'legs', 'upper_body', 'legs', 'abs', 'mobility']
      : goal === 'endurance'
        ? ['cardio', 'full_body', 'cardio', 'legs', 'cardio', 'abs', 'mobility']
        : goal === 'weight_loss'
          ? ['cardio', 'full_body', 'legs', 'cardio', 'abs', 'full_body', 'mobility']
          : ['full_body', 'legs', 'cardio', 'upper_body', 'abs', 'mobility', 'full_body']
  return base.slice(0, daysPerWeek)
}

function buildWorkout(
  type: Workout['type'],
  level: Level,
  minutes: number,
  equipment: Equipment[],
): Workout {
  const meta = WORKOUT_META[type]
  const exerciseCount = minutes <= 15 ? 4 : minutes <= 30 ? 5 : minutes <= 45 ? 6 : 7
  const templates = pickExercises(exerciseCount, equipment, meta.bodyPart)
  const repsFactor = level === 'beginner' ? 0.8 : level === 'advanced' ? 1.25 : 1

  const exercises = templates.map((t) => ({
    id: uid('ex'),
    name: t.name,
    description: t.description,
    muscles: t.muscles,
    sets: Math.max(2, Math.round(t.sets * (level === 'beginner' ? 0.75 : 1))),
    reps: t.durationSeconds ? 1 : Math.round(t.reps * repsFactor),
    durationSeconds: t.durationSeconds ?? undefined,
    restSeconds: t.restSeconds,
    gifUrl: undefined,
    tips: t.tips,
  }))

  const calories = Math.round(minutes * (type === 'cardio' ? 9 : type === 'mobility' ? 4 : 7))

  return {
    id: uid('wk'),
    name: meta.name,
    type,
    duration: minutes,
    difficulty: level,
    equipment: equipment.filter((e) => e !== 'none'),
    calories,
    exercises,
  }
}

export function generateProgram(input: ProgramInput): WorkoutProgram {
  const rotation = typeRotation(input.goal, input.daysPerWeek)
  const weeksCount = 8

  const weeks: WeeklyPlan[] = []
  for (let w = 1; w <= weeksCount; w++) {
    const workouts = rotation.map((type) =>
      buildWorkout(type, input.level, input.sessionMinutes, input.equipment),
    )
    weeks.push({ week: w, workouts })
  }

  return {
    id: uid('prog'),
    userId: input.userId,
    goal: input.goal,
    durationWeeks: weeksCount,
    currentWeek: 1,
    progress: 0,
    daysPerWeek: input.daysPerWeek,
    createdAt: new Date().toISOString(),
    weeks,
  }
}

export const workoutTypeLabels: Record<Workout['type'], string> = {
  full_body: 'Full Body',
  cardio: 'Cardio',
  legs: 'Jambes',
  abs: 'Abdominaux',
  upper_body: 'Haut du corps',
  mobility: 'Mobilité',
}
