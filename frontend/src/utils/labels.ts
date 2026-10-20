import type {
  ActivityType,
  AnnouncementPriority,
  EventCategory,
  Equipment,
  GoalType,
  Level,
  Meal,
  Workout,
} from '@/types'

export const goalLabels: Record<GoalType, string> = {
  weight_loss: 'Perte de poids',
  muscle_gain: 'Prise de masse',
  endurance: 'Endurance',
  fitness: 'Remise en forme',
  wellness: 'Santé et bien-être',
}


export const levelLabels: Record<Level, string> = {
  beginner: 'Débutant',
  intermediate: 'Intermédiaire',
  advanced: 'Avancé',
}

export const workoutTypeLabels: Record<Workout['type'], string> = {
  full_body: 'Full Body',
  cardio: 'Cardio',
  legs: 'Jambes',
  abs: 'Abdominaux',
  upper_body: 'Haut du corps',
  mobility: 'Mobilité',
}


export const equipmentLabels: Record<Equipment, string> = {
  none: 'Aucun',
  dumbbells: 'Haltères',
  bands: 'Élastiques',
  mat: 'Tapis',
  machine: 'Machine',
  gym: 'Salle de sport',
}

export const mealTypeLabels: Record<Meal['type'], string> = {
  breakfast: 'Petit-déjeuner',
  lunch: 'Déjeuner',
  snack: 'Collation',
  dinner: 'Dîner',
}

export const activityTypeLabels: Record<ActivityType, string> = {
  walk: 'Marche',
  run: 'Course',
  bike: 'Vélo',
  other: 'Autre',
}


export const periodLabels = {
  daily: 'Quotidien',
  weekly: 'Hebdomadaire',
  monthly: 'Mensuel',
  allTime: 'Général',
} as const

export const eventCategoryLabels: Record<EventCategory, string> = {
  workshop: 'Atelier',
  run: 'Course collective',
  challenge: 'Défi',
  meetup: 'Rencontre',
  webinar: 'Conférence en ligne',
}

export const announcementPriorityLabels: Record<AnnouncementPriority, string> = {
  info: 'Information',
  important: 'Important',
  urgent: 'Urgent',
}
