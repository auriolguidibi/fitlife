import type {
  Activity,
  Badge,
  MealLogEntry,
  Notification,
  ProgressPoint,
  ShoppingItem,
  User,
  UserBadge,
  UserPreferences,
  WaterLog,
} from '@/types'
import { storage } from '../storage'
import { badgeCatalog } from '@/data/badges'
import { uid } from '@/utils/id'

export const KEYS = {
  users: 'users',
  session: 'session',
  preferences: 'preferences',
  program: 'program',
  nutrition: 'nutrition',
  shopping: 'shopping',
  mealLogs: 'mealLogs',
  water: 'water',
  activities: 'activities',
  steps: 'steps',
  completedWorkouts: 'completedWorkouts',
  participations: 'participations',
  userBadges: 'userBadges',
  posts: 'posts',
  notifications: 'notifications',
  ai: 'ai',
  subscription: 'subscription',
  progress: 'progress',
  liveMessages: 'liveMessages',
  lives: 'lives',
  events: 'events',
  eventAttendance: 'eventAttendance',
  announcements: 'announcements',
  menu: 'menu',
  payments: 'payments',
  dataVersion: 'dataVersion',
}

export function key(name: string, userId?: string): string {
  return userId ? `${name}:${userId}` : name
}

export function getUsers(): User[] {
  return storage.get<User[]>(KEYS.users) ?? []
}

export function saveUsers(users: User[]): void {
  storage.set(KEYS.users, users)
}

export function read<T>(name: string, userId?: string, fallback: T | null = null): T | null {
  return storage.get<T>(key(name, userId)) ?? fallback
}

export function write<T>(name: string, value: T, userId?: string): void {
  storage.set(key(name, userId), value)
}

export function ensureGlobalSeed(): void {
  for (const k of [KEYS.posts, KEYS.lives, KEYS.liveMessages, KEYS.events, KEYS.announcements, KEYS.menu]) {
    if (!storage.get(k)) storage.set(k, [])
  }
  migrateData()
}

const DATA_VERSION = 4

/** Membres fictifs des anciennes versions. */
const FAKE_MEMBER_IDS = ['u_amina', 'u_koffi', 'u_fatou', 'u_moussa', 'u_grace', 'u_ibrahim']

/**
 * v4 : plus aucune donnée inventée. On supprime les lives, événements, annonces, menus,
 * publications, membres fictifs et l'historique généré automatiquement (activités, pas,
 * eau, poids, badges, paiements, notifications) des anciennes versions.
 */
function migrateData(): void {
  const version = storage.get<number>(KEYS.dataVersion) ?? 1
  if (version >= DATA_VERSION) return
  for (const k of [KEYS.posts, KEYS.lives, KEYS.liveMessages, KEYS.events, KEYS.announcements, KEYS.menu]) storage.set(k, [])
  storage.remove('demoRefreshedOn')
  for (const k of storage.keys().filter((k) => k.startsWith(`${KEYS.eventAttendance}:`))) storage.remove(k)
  const users = getUsers().filter((u) => !FAKE_MEMBER_IDS.includes(u.id))
  for (const id of FAKE_MEMBER_IDS) {
    for (const k of storage.keys().filter((k) => k.endsWith(`:${id}`))) storage.remove(k)
  }
  const reset: [string, unknown][] = [
    [KEYS.activities, []], [KEYS.steps, {}], [KEYS.water, []], [KEYS.progress, []], [KEYS.userBadges, []],
    [KEYS.notifications, []], [KEYS.participations, []], [KEYS.payments, []], [KEYS.completedWorkouts, []], [KEYS.ai, []],
  ]
  const cleaned = users.map((u) => {
    for (const [name, value] of reset) write(name, value, u.id)
    if (u.id === 'u_charly') {
      // Le compte de test n'a plus d'abonnement offert d'office.
      write(KEYS.subscription, null, u.id)
      return { ...u, isPremium: false, premiumPlan: undefined }
    }
    return u
  })
  saveUsers(cleaned)
  storage.set(KEYS.dataVersion, DATA_VERSION)
}

export function seedUserData(user: User): void {
  write(KEYS.activities, [] as Activity[], user.id)
  write(KEYS.steps, {} as Record<string, number>, user.id)
  write(KEYS.water, [] as WaterLog[], user.id)
  write(KEYS.progress, [] as ProgressPoint[], user.id)
  write(KEYS.mealLogs, [] as MealLogEntry[], user.id)
  write(KEYS.userBadges, [] as UserBadge[], user.id)
  write(KEYS.completedWorkouts, [] as string[], user.id)
  write(KEYS.participations, [], user.id)
  write(KEYS.subscription, null, user.id)
  write(KEYS.ai, [], user.id)
  write(KEYS.shopping, [] as ShoppingItem[], user.id)
  write(KEYS.notifications, seedNotifications(user), user.id)
}

export function seedNotifications(user: User): Notification[] {
  return [
    {
      id: uid('notif'),
      userId: user.id,
      type: 'encouragement',
      title: 'Bienvenue sur FitLife',
      body: `Bienvenue ${user.firstName} ! Lance ta première marche ou écris à ton coach pour démarrer.`,
      createdAt: new Date().toISOString(),
      read: false,
    },
  ]
}

export function allBadges(): Badge[] {
  return badgeCatalog
}

export const DEMO_CREDENTIALS = { email: 'demo@fitlife.app' }

/** Comptes supprimés par le super admin : ne jamais les recréer au démarrage. */
export function deletedUserIds(): Set<string> {
  return new Set(storage.get<string[]>('deletedUserIds') ?? [])
}

export function markUserDeleted(id: string): void {
  storage.set('deletedUserIds', [...deletedUserIds(), id])
}

export function ensureDemoUser(): void {
  const users = getUsers()
  if (users.some((u) => u.id === 'u_charly') || deletedUserIds().has('u_charly')) {
    ensureStaffUsers()
    return
  }
  const demo: User = {
    id: 'u_charly',
    firstName: 'Charly',
    lastName: 'DIALLO',
    email: DEMO_CREDENTIALS.email,
    phone: '+225 07 00 00 00',
    birthDate: '1993-05-14',
    sex: 'male',
    height: 180,
    weight: 78,
    role: 'user',
    isPremium: false,
    createdAt: new Date().toISOString(),
  }
  saveUsers([...users, demo])
  seedUserData(demo)
  const prefs: UserPreferences = {
    goal: 'weight_loss',
    level: 'intermediate',
    daysPerWeek: 4,
    sessionMinutes: 30,
    equipment: ['none', 'dumbbells', 'mat'],
    favoriteFoods: ['Poulet', 'Riz', 'Banane'],
    avoidedFoods: [],
    allergies: [],
    dietRestrictions: [],
    budget: 'medium',
    mealsPerDay: 4,
    onboarded: true,
  }
  write(KEYS.preferences, prefs, demo.id)
  ensureStaffUsers()
}

function ensureStaffUsers(): void {
  const users = getUsers()
  const deleted = deletedUserIds()

  if (!users.some((u) => u.id === 'u_admin') && !deleted.has('u_admin')) {
    const admin: User = {
      id: 'u_admin',
      firstName: 'Admin',
      lastName: 'FitLife',
      email: 'admin@fitlife.app',
      phone: '+225 01 00 00 00',
      birthDate: '1990-01-01',
      sex: 'male',
      height: 180,
      weight: 80,
      role: 'admin',
      isPremium: true,
      premiumPlan: 'premium',
      createdAt: new Date(Date.now() - 200 * 864e5).toISOString(),
    }
    saveUsers([...getUsers(), admin])
    write(KEYS.activities, [] as Activity[], 'u_admin')
    write(KEYS.preferences, {
      goal: 'fitness', level: 'advanced', daysPerWeek: 5, sessionMinutes: 45,
      equipment: ['gym'], favoriteFoods: [], avoidedFoods: [], allergies: [], dietRestrictions: [],
      budget: 'high', mealsPerDay: 4, onboarded: true,
    }, 'u_admin')
  }

  if (!users.some((u) => u.id === 'u_coach') && !deleted.has('u_coach')) {
    const coach: User = {
      id: 'u_coach',
      firstName: 'Coach',
      lastName: 'Awa',
      email: 'coach@fitlife.app',
      phone: '+225 05 00 00 00',
      birthDate: '1988-03-01',
      sex: 'female',
      height: 168,
      weight: 62,
      role: 'coach',
      isPremium: true,
      premiumPlan: 'premium',
      createdAt: new Date(Date.now() - 300 * 864e5).toISOString(),
    }
    saveUsers([...getUsers(), coach])
    write(KEYS.preferences, {
      goal: 'wellness', level: 'advanced', daysPerWeek: 7, sessionMinutes: 60,
      equipment: ['gym'], favoriteFoods: [], avoidedFoods: [], allergies: [], dietRestrictions: [],
      budget: 'high', mealsPerDay: 4, onboarded: true,
    }, 'u_coach')
    write(KEYS.activities, [], 'u_coach')
  }

  // Super administrateur : gère tous les comptes (espace /super-admin)
  if (!getUsers().some((u) => u.id === 'u_superadmin') && !deleted.has('u_superadmin')) {
    const superAdmin: User = {
      id: 'u_superadmin',
      firstName: 'Super',
      lastName: 'Admin',
      email: 'superadmin@fitlife.app',
      phone: '+225 07 07 07 07',
      birthDate: '1987-06-15',
      sex: 'male',
      height: 178,
      weight: 76,
      role: 'superadmin',
      isPremium: true,
      premiumPlan: 'premium',
      createdAt: new Date(Date.now() - 400 * 864e5).toISOString(),
    }
    saveUsers([...getUsers(), superAdmin])
    write(KEYS.preferences, {
      goal: 'fitness', level: 'intermediate', daysPerWeek: 4, sessionMinutes: 45,
      equipment: ['gym'], favoriteFoods: [], avoidedFoods: [], allergies: [], dietRestrictions: [],
      budget: 'high', mealsPerDay: 4, onboarded: true,
    }, 'u_superadmin')
    write(KEYS.activities, [], 'u_superadmin')
  }

}

export function bootstrap(): void {
  ensureGlobalSeed()
  ensureDemoUser()
  // Idempotent : ajoute les comptes d'équipe / de démo manquants (ex. super admin ajouté après coup).
  ensureStaffUsers()
}

