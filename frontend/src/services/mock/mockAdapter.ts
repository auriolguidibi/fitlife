import { PASSWORD_SALT, seededPasswordHashes } from '@/data/demoCredentials'
import type {
  CoachMessage,
  CoachThread,
  PromoCode,
  PromoCodeInput,
  PromoRedemption,
  Activity,
  CheckoutInput,
  MenuItem,
  MenuItemInput,
  Payment,
  Announcement,
  AnnouncementInput,
  EventInput,
  FitEvent,
  AuthSession,
  ChatMessage,
  Challenge,
  ChallengeParticipation,
  CommunityPost,
  Leaderboard,
  LeaderboardEntry,
  LeaderboardPeriod,
  LiveMessage,
  LiveSession,
  LiveSignal,
  MealLogEntry,
  Notification,
  NutritionPlan,
  ProgressPoint,
  ProgressRange,
  ProgressSummary,
  RegisterPayload,
  ShoppingItem,
  Subscription,
  SubscriptionPlan,
  User,
  UserPreferences,
  WaterLog,
  WorkoutProgram,
} from '@/types'
import {
  ApiError,
  type AdminStats,
  type AdminUserRow,
  type ManagedUser,
  type BadgeCollection,
  type CommunityFeedItem,
  type CompleteWorkoutPayload,
  type DataService,
  type StartActivityPayload,
  type UpdateActivityPayload,
} from '../types'
import { storage } from '../storage'
import {
  KEYS,
  allBadges,
  bootstrap,
  getUsers,
  key,
  markUserDeleted,
  read,
  saveUsers,
  seedUserData,
  write,
} from './db'
import { badgeById } from '@/data/badges'
import { subscriptionPlans, planById, paymentMethodById } from '@/data/plans'
import { generateProgram } from '@/utils/programGenerator'
import { generateNutritionPlan, generateShoppingList } from '@/utils/nutritionGenerator'
import { ageFromBirthDate, bmr, tdee } from '@/utils/fitness'
import { reviewActivity, isDuplicateActivity } from '@/utils/antiCheat'
import { uid, todayKey, round } from '@/utils/id'
import { isAdmin, isStaff, isSuperAdmin } from '@/utils/roles'

interface SessionRecord {
  token: string
  userId: string
}

/** Empreintes des mots de passe (mode démo) : jamais le mot de passe lui-même. */
const CREDENTIALS_KEY = 'credentials'

async function passwordHash(userId: string, password: string): Promise<string> {
  const data = new TextEncoder().encode(`${PASSWORD_SALT}${userId}:${password}`)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('')
}

/** Signaux WebRTC du direct caméra (même appareil en mode démo). */
const SIGNALS_KEY = 'liveSignals'

const DEFAULT_PREFS: UserPreferences = {
  goal: 'fitness',
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
}

function longDate(iso: string): string {
  return new Date(iso).toLocaleString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })
}

function delay<T>(value: T, ms = 180): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms))
}

class MockAdapter implements DataService {
  constructor() {
    bootstrap()
  }

  private session(): SessionRecord | null {
    return storage.get<SessionRecord>(KEYS.session)
  }

  /** Coachs et administrateurs : gestion des lives, événements et annonces. */
  private requireStaff(): User {
    const user = this.currentUser()
    if (!isStaff(user)) throw new ApiError('Accès réservé aux coachs et administrateurs', 403)
    return user
  }

  /** Envoie une notification à tous les membres (sauf l'auteur). */
  private broadcast(fromId: string, type: Notification['type'], title: string, body: string): void {
    for (const u of getUsers()) if (u.id !== fromId) this.pushNotification(u.id, type, title, body)
  }

  private currentUser(): User {
    const s = this.session()
    if (!s) throw new ApiError('Non authentifié', 401)
    const user = getUsers().find((u) => u.id === s.userId)
    if (!user) throw new ApiError('Utilisateur introuvable', 404)
    return user
  }

  private prefs(userId: string): UserPreferences {
    return read<UserPreferences>(KEYS.preferences, userId, DEFAULT_PREFS) ?? DEFAULT_PREFS
  }

  private authSession(user: User): AuthSession {
    const s = this.session()
    return {
      token: s?.token ?? uid('tok'),
      user,
      preferences: this.prefs(user.id),
    }
  }

  private programFor(user: User): WorkoutProgram {
    const existing = read<WorkoutProgram>(KEYS.program, user.id)
    if (existing) return existing
    const p = this.prefs(user.id)
    const program = generateProgram({
      userId: user.id,
      goal: p.goal,
      level: p.level,
      daysPerWeek: p.daysPerWeek,
      sessionMinutes: p.sessionMinutes,
      equipment: p.equipment.length ? p.equipment : ['none'],
    })
    write(KEYS.program, program, user.id)
    return program
  }

  private dailyCalories(user: User): number {
    const p = this.prefs(user.id)
    const b = bmr(user.weight, user.height, ageFromBirthDate(user.birthDate), user.sex)
    return tdee(b, p.level)
  }

  private nutritionFor(user: User): NutritionPlan {
    const existing = read<NutritionPlan>(KEYS.nutrition, user.id)
    if (existing) return existing
    const p = this.prefs(user.id)
    const plan = generateNutritionPlan({
      userId: user.id,
      goal: p.goal,
      dailyCalories: this.dailyCalories(user),
      preferences: p,
    })
    write(KEYS.nutrition, plan, user.id)
    return plan
  }

  private activities(userId: string): Activity[] {
    return read<Activity[]>(KEYS.activities, userId, []) ?? []
  }

  private saveActivities(userId: string, list: Activity[]): void {
    write(KEYS.activities, list, userId)
  }

  private distanceInRange(userId: string, period: LeaderboardPeriod): number {
    const list = this.activities(userId).filter((a) => a.reviewStatus === 'validated')
    const now = Date.now()
    const cutoff =
      period === 'daily'
        ? new Date(todayKey()).getTime()
        : period === 'weekly'
          ? now - 7 * 864e5
          : period === 'monthly'
            ? now - 30 * 864e5
            : 0
    return round(
      list
        .filter((a) => new Date(a.startedAt).getTime() >= cutoff)
        .reduce((sum, a) => sum + a.distanceKm, 0),
      1,
    )
  }

  private awardBadges(userId: string): void {
    const earned = read<{ badgeId: string; userId: string; earnedAt: string }[]>(
      KEYS.userBadges,
      userId,
      [],
    ) ?? []
    const total = round(
      this.activities(userId)
        .filter((a) => a.reviewStatus === 'validated')
        .reduce((s, a) => s + a.distanceKm, 0),
      1,
    )
    const sessions = (read<string[]>(KEYS.completedWorkouts, userId, []) ?? []).length
    const rules: { id: string; ok: boolean }[] = [
      { id: 'b_first_step', ok: total >= 1 },
      { id: 'b_5km', ok: total >= 5 },
      { id: 'b_25km', ok: total >= 25 },
      { id: 'b_100km', ok: total >= 100 },
      { id: 'b_20_sessions', ok: sessions >= 20 },
    ]
    let added = false
    rules.forEach((r) => {
      if (r.ok && !earned.some((e) => e.badgeId === r.id)) {
        earned.push({ badgeId: r.id, userId, earnedAt: new Date().toISOString() })
        added = true
        const badge = badgeById(r.id)
        if (badge) this.pushNotification(userId, 'badge', `Nouveau badge : ${badge.name}`, badge.description)
      }
    })
    if (added) write(KEYS.userBadges, earned, userId)
  }

  private pushNotification(
    userId: string,
    type: Notification['type'],
    title: string,
    body: string,
  ): void {
    const list = read<Notification[]>(KEYS.notifications, userId, []) ?? []
    list.unshift({ id: uid('notif'), userId, type, title, body, createdAt: new Date().toISOString(), read: false })
    write(KEYS.notifications, list, userId)
  }

  // ---------- Auth ----------
  async register(payload: RegisterPayload): Promise<AuthSession> {
    const users = getUsers()
    if (users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
      throw new ApiError('Cet email est déjà utilisé.', 409)
    }
    const user: User = {
      id: uid('u'),
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      phone: payload.phone,
      birthDate: payload.birthDate,
      sex: payload.sex,
      height: payload.height,
      weight: payload.weight,
      role: 'user',
      isPremium: false,
      createdAt: new Date().toISOString(),
    }
    saveUsers([...users, user])
    storage.set(CREDENTIALS_KEY, { ...(storage.get<Record<string, string>>(CREDENTIALS_KEY) ?? {}), [user.id]: await passwordHash(user.id, payload.password) })
    seedUserData(user)
    // Le super admin est prévenu de chaque inscription (dossier dans l'Espace Super admin).
    for (const admin of users.filter((u) => u.role === 'superadmin')) {
      this.pushNotification(admin.id, 'announcement', 'Nouvelle inscription', `${user.firstName} ${user.lastName} · ${user.email}`)
    }
    write(KEYS.preferences, DEFAULT_PREFS, user.id)
    const session: SessionRecord = { token: uid('tok'), userId: user.id }
    storage.set(KEYS.session, session)
    return delay(this.authSession(user))
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const user = getUsers().find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) throw new ApiError('Identifiants incorrects.', 401)

    const hash = await passwordHash(user.id, password)
    const stored = storage.get<Record<string, string>>(CREDENTIALS_KEY) ?? {}
    const expected = stored[user.id] ?? seededPasswordHashes[user.id]

    const isValid = !!expected && hash === expected

    if (!isValid) {
      throw new ApiError('Identifiants incorrects.', 401)
    }

    if (!stored[user.id] && expected) {
      storage.set(CREDENTIALS_KEY, { ...stored, [user.id]: expected })
    }

    const session: SessionRecord = { token: uid('tok'), userId: user.id }
    storage.set(KEYS.session, session)
    return delay(this.authSession(user))
  }

  async logout(): Promise<void> {
    storage.remove(KEYS.session)
  }

  getSession(): AuthSession | null {
    const s = this.session()
    if (!s) return null
    const user = getUsers().find((u) => u.id === s.userId)
    if (!user) return null
    return this.authSession(user)
  }

  async savePreferences(prefs: Partial<UserPreferences>): Promise<AuthSession> {
    const user = this.currentUser()
    const merged = { ...this.prefs(user.id), ...prefs }
    write(KEYS.preferences, merged, user.id)
    storage.remove(key(KEYS.program, user.id))
    storage.remove(key(KEYS.nutrition, user.id))
    storage.remove(key(KEYS.shopping, user.id))
    return delay(this.authSession(user))
  }

  // ---------- Profile ----------
  async getProfile(): Promise<User> {
    return delay(this.currentUser())
  }

  async updateProfile(patch: Partial<User>): Promise<User> {
    const user = this.currentUser()
    // Seuls les champs modifiables par le membre (pas de rôle, d'e-mail ni de statut Premium).
    const editable: (keyof User)[] = ['firstName', 'lastName', 'phone', 'height', 'weight', 'sex', 'birthDate', 'avatarUrl']
    const safe = Object.fromEntries(Object.entries(patch).filter(([k]) => editable.includes(k as keyof User))) as Partial<User>
    const users = getUsers().map((u) => (u.id === user.id ? { ...u, ...safe } : u))
    saveUsers(users)
    return delay(users.find((u) => u.id === user.id)!)
  }

  async uploadAvatar(image: Blob): Promise<User> {
    if (image.size > 2 * 1024 * 1024) throw new ApiError('Image trop lourde', 413)
    // Démo : la photo (déjà réduite à 512 px) est conservée en data URL dans le navigateur.
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(new ApiError('Lecture de l’image impossible', 400))
      reader.readAsDataURL(image)
    })
    return this.updateProfile({ avatarUrl: dataUrl })
  }

  async removeAvatar(): Promise<User> {
    const user = this.currentUser()
    const users = getUsers().map((u) => (u.id === user.id ? { ...u, avatarUrl: undefined } : u))
    saveUsers(users)
    return delay(users.find((u) => u.id === user.id)!)
  }

  async getPreferences(): Promise<UserPreferences> {
    const user = this.currentUser()
    return delay(this.prefs(user.id))
  }

  // ---------- Program ----------
  async getProgram(): Promise<WorkoutProgram> {
    return delay(this.programFor(this.currentUser()))
  }

  async completeWorkout(payload: CompleteWorkoutPayload): Promise<WorkoutProgram> {
    const user = this.currentUser()
    const program = this.programFor(user)
    const completed = read<string[]>(KEYS.completedWorkouts, user.id, []) ?? []
    if (!completed.includes(payload.workoutId)) completed.push(payload.workoutId)
    write(KEYS.completedWorkouts, completed, user.id)

    const totalWorkouts = program.weeks.reduce((s, w) => s + w.workouts.length, 0)
    program.progress = Math.min(100, Math.round((completed.length / totalWorkouts) * 100))
    program.currentWeek = Math.min(program.durationWeeks, Math.floor(completed.length / program.daysPerWeek) + 1)
    program.weeks.forEach((w) =>
      w.workouts.forEach((wo) => {
        if (wo.id === payload.workoutId) wo.completed = true
      }),
    )
    write(KEYS.program, program, user.id)
    this.awardBadges(user.id)
    return delay(program)
  }

  // ---------- Nutrition ----------
  async getNutritionPlan(): Promise<NutritionPlan> {
    return delay(this.nutritionFor(this.currentUser()))
  }

  async getMealLogs(date: string): Promise<MealLogEntry[]> {
    const user = this.currentUser()
    const all = read<MealLogEntry[]>(KEYS.mealLogs, user.id, []) ?? []
    return delay(all.filter((m) => m.date === date))
  }

  async logMeal(entry: Omit<MealLogEntry, 'id'>): Promise<MealLogEntry> {
    const user = this.currentUser()
    const all = read<MealLogEntry[]>(KEYS.mealLogs, user.id, []) ?? []
    const full: MealLogEntry = { ...entry, id: uid('log') }
    all.push(full)
    write(KEYS.mealLogs, all, user.id)
    return delay(full)
  }

  async removeMealLog(id: string): Promise<void> {
    const user = this.currentUser()
    const all = (read<MealLogEntry[]>(KEYS.mealLogs, user.id, []) ?? []).filter((m) => m.id !== id)
    write(KEYS.mealLogs, all, user.id)
    return delay(undefined, 80)
  }

  async getShoppingList(): Promise<ShoppingItem[]> {
    const user = this.currentUser()
    const existing = read<ShoppingItem[]>(KEYS.shopping, user.id)
    if (existing && existing.length) return delay(existing)
    return this.regenerateShoppingList()
  }

  async regenerateShoppingList(): Promise<ShoppingItem[]> {
    const user = this.currentUser()
    const list = generateShoppingList(this.nutritionFor(user))
    write(KEYS.shopping, list, user.id)
    return delay(list)
  }

  async toggleShoppingItem(id: string): Promise<ShoppingItem[]> {
    const user = this.currentUser()
    const list = (read<ShoppingItem[]>(KEYS.shopping, user.id, []) ?? []).map((i) =>
      i.id === id ? { ...i, checked: !i.checked } : i,
    )
    write(KEYS.shopping, list, user.id)
    return delay(list, 60)
  }

  async addShoppingItem(name: string, quantity: string): Promise<ShoppingItem[]> {
    const user = this.currentUser()
    const list = read<ShoppingItem[]>(KEYS.shopping, user.id, []) ?? []
    list.push({ id: uid('shop'), name, quantity, category: 'Ajouté', checked: false })
    write(KEYS.shopping, list, user.id)
    return delay(list, 60)
  }

  // ---------- Hydration ----------
  async getWaterLog(date: string): Promise<WaterLog> {
    const user = this.currentUser()
    const logs = read<WaterLog[]>(KEYS.water, user.id, []) ?? []
    return delay(logs.find((w) => w.date === date) ?? { date, ml: 0 })
  }

  async addWater(ml: number): Promise<WaterLog> {
    const user = this.currentUser()
    const date = todayKey()
    const logs = read<WaterLog[]>(KEYS.water, user.id, []) ?? []
    const idx = logs.findIndex((w) => w.date === date)
    const updated: WaterLog = { date, ml: Math.max(0, (idx >= 0 ? logs[idx].ml : 0) + ml) }
    if (idx >= 0) logs[idx] = updated
    else logs.push(updated)
    write(KEYS.water, logs, user.id)
    return delay(updated, 60)
  }

  // ---------- Activity ----------
  async cancelActivity(id: string): Promise<void> {
    const user = this.currentUser()
    const list = this.activities(user.id)
    const target = list.find((a) => a.id === id)
    if (!target) throw new ApiError('Activité introuvable', 404)
    if (target.status === 'finished') throw new ApiError('Une activité terminée ne peut pas être abandonnée', 409)
    this.saveActivities(user.id, list.filter((a) => a.id !== id))
    return delay(undefined, 60)
  }

  async startActivity(payload: StartActivityPayload): Promise<Activity> {
    const user = this.currentUser()
    const activity: Activity = {
      id: uid('act'),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`,
      type: payload.type,
      status: 'active',
      startedAt: new Date().toISOString(),
      durationSeconds: 0,
      movingSeconds: 0,
      distanceKm: 0,
      steps: 0,
      avgSpeedKmh: 0,
      maxSpeedKmh: 0,
      calories: 0,
      route: [],
      reviewStatus: 'pending',
    }
    const list = this.activities(user.id)
    list.unshift(activity)
    this.saveActivities(user.id, list)
    return delay(activity, 80)
  }

  async updateActivity(id: string, patch: UpdateActivityPayload): Promise<Activity> {
    const user = this.currentUser()
    const list = this.activities(user.id)
    const idx = list.findIndex((a) => a.id === id)
    if (idx < 0) throw new ApiError('Activité introuvable', 404)
    list[idx] = { ...list[idx], ...patch }
    this.saveActivities(user.id, list)
    return list[idx]
  }

  async finishActivity(id: string): Promise<{ activity: Activity; flagged: boolean; reason?: string }> {
    const user = this.currentUser()
    const list = this.activities(user.id)
    const idx = list.findIndex((a) => a.id === id)
    if (idx < 0) throw new ApiError('Activité introuvable', 404)
    let activity: Activity = {
      ...list[idx],
      status: 'finished',
      finishedAt: new Date().toISOString(),
    }
    activity = { ...activity, avgSpeedKmh: round(activity.distanceKm / Math.max(0.01, activity.movingSeconds / 3600)) }

    const others = list.filter((a) => a.id !== id)
    const review = reviewActivity(activity)
    const duplicate = isDuplicateActivity(activity, others)
    if (duplicate) {
      activity.reviewStatus = 'rejected'
      activity.reviewReason = 'Session en doublon détectée.'
    } else {
      activity.reviewStatus = review.status
      activity.reviewReason = review.reason
    }
    list[idx] = activity
    this.saveActivities(user.id, list)

    if (activity.reviewStatus === 'validated') this.awardBadges(user.id)
    return delay(
      { activity, flagged: activity.reviewStatus !== 'validated', reason: activity.reviewReason },
      120,
    )
  }

  async getActivities(): Promise<Activity[]> {
    return delay(this.activities(this.currentUser().id))
  }

  async getActiveActivity(): Promise<Activity | null> {
    const active = this.activities(this.currentUser().id).find((a) => a.status === 'active' || a.status === 'paused')
    return delay(active ?? null, 80)
  }

  async getSteps(date: string): Promise<number> {
    const user = this.currentUser()
    const map = read<Record<string, number>>(KEYS.steps, user.id, {}) ?? {}
    return delay(map[date] ?? 0, 60)
  }

  async setSteps(date: string, steps: number): Promise<number> {
    const user = this.currentUser()
    const map = read<Record<string, number>>(KEYS.steps, user.id, {}) ?? {}
    map[date] = Math.max(map[date] ?? 0, steps)
    write(KEYS.steps, map, user.id)
    return map[date]
  }

  // ---------- Leaderboard ----------
  async getLeaderboard(period: LeaderboardPeriod): Promise<Leaderboard> {
    const user = this.currentUser()
    const merged: LeaderboardEntry[] = getUsers()
      .map((u) => ({
        userId: u.id,
        name: u.id === user.id ? u.firstName : `${u.firstName} ${u.lastName}`.trim(),
        avatarUrl: u.avatarUrl,
        distanceKm: this.distanceInRange(u.id, period),
        rank: 0,
        isCurrentUser: u.id === user.id,
      }))
      .filter((e) => e.isCurrentUser || e.distanceKm > 0)
      .sort((a, b) => b.distanceKm - a.distanceKm)
    merged.forEach((e, i) => (e.rank = i + 1))
    const currentUserRank = merged.find((e) => e.isCurrentUser)
    const above = currentUserRank ? merged.find((e) => e.rank === currentUserRank.rank - 1) : undefined
    return delay({
      period,
      entries: merged,
      currentUserRank,
      nextTargetKm: above ? round(above.distanceKm - (currentUserRank?.distanceKm ?? 0), 1) : undefined,
      nextTargetName: above?.name,
    })
  }

  // ---------- Challenges ----------
  async getChallenges(): Promise<Challenge[]> {
    const { challengeCatalog } = await import('@/data/challenges')
    // Vrai nombre de participants (membres inscrits sur cet appareil).
    const parts = getUsers().flatMap((u) => read<ChallengeParticipation[]>(KEYS.participations, u.id, []) ?? [])
    return delay(challengeCatalog.map((c) => ({ ...c, participants: parts.filter((p) => p.challengeId === c.id).length })))
  }

  async getParticipations(): Promise<ChallengeParticipation[]> {
    return delay(read<ChallengeParticipation[]>(KEYS.participations, this.currentUser().id, []) ?? [])
  }

  async leaveChallenge(id: string): Promise<void> {
    const user = this.currentUser()
    const list = read<ChallengeParticipation[]>(KEYS.participations, user.id, []) ?? []
    write(KEYS.participations, list.filter((p) => p.challengeId !== id), user.id)
    return delay(undefined, 80)
  }

  async joinChallenge(id: string): Promise<ChallengeParticipation> {
    const user = this.currentUser()
    const list = read<ChallengeParticipation[]>(KEYS.participations, user.id, []) ?? []
    const existing = list.find((p) => p.challengeId === id)
    if (existing) return delay(existing)
    const part: ChallengeParticipation = {
      challengeId: id,
      userId: user.id,
      progress: this.challengeProgress(id),
      joinedAt: new Date().toISOString(),
      completed: false,
    }
    list.push(part)
    write(KEYS.participations, list, user.id)
    return delay(part)
  }

  private challengeProgress(challengeId: string): number {
    const user = this.currentUser()
    switch (challengeId) {
      case 'ch_5km':
      case 'ch_100km':
        return this.distanceInRange(user.id, challengeId === 'ch_5km' ? 'weekly' : 'monthly')
      case 'ch_10000_steps': {
        const map = read<Record<string, number>>(KEYS.steps, user.id, {}) ?? {}
        return map[todayKey()] ?? 0
      }
      case 'ch_20_sessions':
        return (read<string[]>(KEYS.completedWorkouts, user.id, []) ?? []).length
      case 'ch_30_days': {
        const days = new Set(this.activities(user.id).map((a) => a.startedAt.slice(0, 10)))
        return days.size
      }
      default:
        return 0
    }
  }

  // ---------- Badges ----------
  async getBadges(): Promise<BadgeCollection> {
    const user = this.currentUser()
    return delay({
      all: allBadges(),
      earned: read(KEYS.userBadges, user.id, []) ?? [],
    })
  }

  // ---------- Community ----------
  async getFeed(): Promise<CommunityFeedItem[]> {
    return delay(storage.get<CommunityPost[]>(KEYS.posts) ?? [])
  }

  async createPost(
    content: string,
    activitySummary?: CommunityPost['activitySummary'],
  ): Promise<CommunityPost> {
    const user = this.currentUser()
    const posts = storage.get<CommunityPost[]>(KEYS.posts) ?? []
    const post: CommunityPost = {
      id: uid('post'),
      userId: user.id,
      userName: `${user.firstName} ${user.lastName}`.trim(),
      avatarUrl: user.avatarUrl,
      content,
      createdAt: new Date().toISOString(),
      likes: 0,
      likedByMe: false,
      comments: [],
      activitySummary,
    }
    posts.unshift(post)
    storage.set(KEYS.posts, posts)
    return delay(post)
  }

  async toggleLike(postId: string): Promise<CommunityPost> {
    const posts = storage.get<CommunityPost[]>(KEYS.posts) ?? []
    const post = posts.find((p) => p.id === postId)
    if (!post) throw new ApiError('Publication introuvable', 404)
    post.likedByMe = !post.likedByMe
    post.likes += post.likedByMe ? 1 : -1
    storage.set(KEYS.posts, posts)
    return delay(post, 60)
  }

  async addComment(postId: string, text: string): Promise<CommunityPost> {
    const user = this.currentUser()
    const posts = storage.get<CommunityPost[]>(KEYS.posts) ?? []
    const post = posts.find((p) => p.id === postId)
    if (!post) throw new ApiError('Publication introuvable', 404)
    post.comments.push({
      id: uid('c'),
      postId,
      userId: user.id,
      userName: user.firstName,
      text,
      createdAt: new Date().toISOString(),
    })
    storage.set(KEYS.posts, posts)
    return delay(post, 60)
  }

  // ---------- Lives ----------
  async getLives(): Promise<LiveSession[]> {
    return delay(storage.get<LiveSession[]>(KEYS.lives) ?? [])
  }

  async getLive(id: string): Promise<LiveSession> {
    const live = (storage.get<LiveSession[]>(KEYS.lives) ?? []).find((l) => l.id === id)
    if (!live) throw new ApiError('Live introuvable', 404)
    return delay(live, 80)
  }

  async getLiveMessages(id: string): Promise<LiveMessage[]> {
    const all = storage.get<LiveMessage[]>(KEYS.liveMessages) ?? []
    return delay(all.filter((m) => m.liveId === id))
  }

  async sendLiveMessage(id: string, text: string, isQuestion?: boolean): Promise<LiveMessage> {
    const user = this.currentUser()
    const staff = isStaff(user)
    // Offre : le chat avec le coach pendant les lives est réservé au Premium.
    if (!staff && !user.isPremium) throw new ApiError('Le chat des lives est réservé aux membres Premium', 403)
    const live = (storage.get<LiveSession[]>(KEYS.lives) ?? []).find((l) => l.id === id)
    if (!live) throw new ApiError('Live introuvable', 404)
    if (live.status !== 'live') throw new ApiError('Le chat est ouvert uniquement pendant le direct', 409)
    const clean = text.trim().slice(0, 500)
    if (!clean) throw new ApiError('Message vide', 400)
    const all = storage.get<LiveMessage[]>(KEYS.liveMessages) ?? []
    const msg: LiveMessage = {
      id: uid('lm'),
      liveId: id,
      userId: user.id,
      userName: staff ? `${user.firstName} ${user.lastName}`.trim() : user.firstName,
      avatarUrl: user.avatarUrl,
      text: clean,
      createdAt: new Date().toISOString(),
      isCoach: staff,
      isQuestion: !staff && !!isQuestion,
    }
    all.push(msg)
    storage.set(KEYS.liveMessages, all)
    return delay(msg, 50)
  }

  async createLive(input: Partial<LiveSession>): Promise<LiveSession> {
    const author = this.requireStaff()
    const lives = storage.get<LiveSession[]>(KEYS.lives) ?? []
    const live: LiveSession = {
      id: uid('live'),
      coachId: input.coachId ?? (author.role === 'coach' ? author.id : 'coach_awa'),
      coachName: input.coachName ?? (author.role === 'coach' ? `${author.firstName} ${author.lastName}` : 'Coach Awa'),
      title: input.title ?? 'Nouveau live',
      description: input.description ?? '',
      status: 'scheduled',
      scheduledAt: input.scheduledAt ?? new Date(Date.now() + 864e5).toISOString(),
      durationMinutes: input.durationMinutes ?? 30,
      viewers: 0,
      level: input.level ?? 'beginner',
      premiumOnly: input.premiumOnly ?? false,
      streamUrl: input.streamUrl?.trim() || null,
    }
    if (input.status === 'live') {
      live.status = 'live'
      live.scheduledAt = new Date().toISOString()
      live.viewers = 1
    }
    lives.unshift(live)
    storage.set(KEYS.lives, lives)
    this.broadcast(
      author.id,
      'live',
      live.status === 'live' ? `${live.coachName} est en direct` : `Nouveau live programmé : ${live.title}`,
      live.status === 'live' ? `${live.title} vient de commencer. Rejoins la séance !` : `Le ${longDate(live.scheduledAt)}.`,
    )
    return delay(live)
  }

  async setLiveStatus(id: string, status: LiveSession['status']): Promise<LiveSession> {
    this.requireStaff()
    const lives = storage.get<LiveSession[]>(KEYS.lives) ?? []
    const live = lives.find((l) => l.id === id)
    if (!live) throw new ApiError('Live introuvable', 404)
    const wasLive = live.status === 'live'
    live.status = status
    if (status === 'live') live.viewers = Math.max(live.viewers, 1)
    if (status === 'ended') live.cameraOn = false
    storage.set(KEYS.lives, lives)
    if (status === 'live' && !wasLive) {
      // Tous les membres sont prévenus au moment où l'hôte lance le direct.
      this.broadcast(this.currentUser().id, 'live', `${live.coachName} est en direct`, `${live.title} vient de commencer. Rejoins la séance !`)
    }
    return delay(live, 80)
  }

  async updateLive(id: string, patch: Partial<LiveSession>): Promise<LiveSession> {
    this.requireStaff()
    const lives = storage.get<LiveSession[]>(KEYS.lives) ?? []
    const i = lives.findIndex((l) => l.id === id)
    if (i < 0) throw new ApiError('Live introuvable', 404)
    const { id: _id, viewers: _viewers, ...editable } = patch
    void _id
    void _viewers
    lives[i] = { ...lives[i], ...editable }
    storage.set(KEYS.lives, lives)
    return delay(lives[i], 80)
  }

  async setLiveBroadcast(id: string, state: { cameraOn: boolean; micOn: boolean }): Promise<LiveSession> {
    const host = this.requireStaff()
    const lives = storage.get<LiveSession[]>(KEYS.lives) ?? []
    const live = lives.find((l) => l.id === id)
    if (!live) throw new ApiError('Live introuvable', 404)
    if (live.status !== 'live') throw new ApiError('Le live n’est pas en direct', 409)
    live.hostUserId = host.id
    live.cameraOn = state.cameraOn
    storage.set(KEYS.lives, lives)
    return delay(live, 40)
  }

  async sendLiveSignal(id: string, to: string, kind: LiveSignal['kind'], payload?: unknown): Promise<void> {
    const me = this.currentUser()
    const all = storage.get<(LiveSignal & { liveId: string; to: string })[]>(SIGNALS_KEY) ?? []
    all.push({ liveId: id, to, from: me.id, kind, payload })
    storage.set(SIGNALS_KEY, all.slice(-200))
  }

  async getLiveSignals(id: string): Promise<LiveSignal[]> {
    const me = this.currentUser()
    const all = storage.get<(LiveSignal & { liveId: string; to: string })[]>(SIGNALS_KEY) ?? []
    const mine = all.filter((s) => s.liveId === id && s.to === me.id)
    if (mine.length) storage.set(SIGNALS_KEY, all.filter((s) => !mine.includes(s)))
    return mine.map(({ from, kind, payload }) => ({ from, kind, payload }))
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const me = this.currentUser()
    const stored = storage.get<Record<string, string>>(CREDENTIALS_KEY) ?? {}
    const expected = stored[me.id] ?? seededPasswordHashes[me.id]
    if (!expected || (await passwordHash(me.id, currentPassword)) !== expected) {
      throw new ApiError('Mot de passe actuel incorrect.', 400)
    }
    if (newPassword.length < 8) throw new ApiError('Le nouveau mot de passe doit contenir au moins 8 caractères.', 400)
    if (newPassword === currentPassword) throw new ApiError('Le nouveau mot de passe doit être différent de l’actuel.', 400)
    storage.set(CREDENTIALS_KEY, { ...stored, [me.id]: await passwordHash(me.id, newPassword) })
    this.pushNotification(me.id, 'announcement', 'Mot de passe modifié', 'Ton mot de passe a été changé. Si ce n’est pas toi, contacte immédiatement le support.')
    return delay(undefined, 120)
  }

  async deleteMyAccount(): Promise<void> {
    const me = this.currentUser()
    const users = getUsers()
    if (me.role === 'superadmin' && users.filter((u) => u.role === 'superadmin').length <= 1) {
      throw new ApiError('Tu es le dernier super admin : nomme un autre super admin avant de supprimer ton compte.', 409)
    }
    saveUsers(users.filter((u) => u.id !== me.id))
    markUserDeleted(me.id)
    for (const k of storage.keys().filter((k) => k.endsWith(`:${me.id}`))) storage.remove(k)
    storage.set(KEYS.posts, (storage.get<CommunityPost[]>(KEYS.posts) ?? []).filter((post) => post.userId !== me.id))
    storage.set(KEYS.liveMessages, (storage.get<LiveMessage[]>(KEYS.liveMessages) ?? []).filter((m) => m.userId !== me.id))
    storage.remove(KEYS.session)
    return delay(undefined, 120)
  }

  async deleteLive(id: string): Promise<void> {
    this.requireStaff()
    storage.set(KEYS.lives, (storage.get<LiveSession[]>(KEYS.lives) ?? []).filter((l) => l.id !== id))
    storage.set(KEYS.liveMessages, (storage.get<LiveMessage[]>(KEYS.liveMessages) ?? []).filter((m) => m.liveId !== id))
    return delay(undefined, 80)
  }

  // ---------- Événements ----------
  private eventsWithAttendance(userId: string): FitEvent[] {
    const mine = new Set(read<string[]>(KEYS.eventAttendance, userId, []) ?? [])
    return (storage.get<FitEvent[]>(KEYS.events) ?? [])
      .map((e) => ({ ...e, attending: mine.has(e.id) }))
      .sort((a, b) => a.startsAt.localeCompare(b.startsAt))
  }

  async getEvents(): Promise<FitEvent[]> {
    return delay(this.eventsWithAttendance(this.currentUser().id))
  }

  async createEvent(input: EventInput): Promise<FitEvent> {
    const author = this.requireStaff()
    const now = new Date().toISOString()
    const event: FitEvent = {
      ...input,
      id: uid('evt'),
      attendees: 0,
      attending: false,
      createdBy: `${author.firstName} ${author.lastName}`.trim(),
      createdAt: now,
      updatedAt: now,
    }
    storage.set(KEYS.events, [...(storage.get<FitEvent[]>(KEYS.events) ?? []), event])
    this.broadcast(author.id, 'event', `Nouvel événement : ${event.title}`, `${longDate(event.startsAt)} · ${event.location}`)
    return delay(event)
  }

  async updateEvent(id: string, patch: Partial<EventInput>): Promise<FitEvent> {
    const user = this.requireStaff()
    const events = storage.get<FitEvent[]>(KEYS.events) ?? []
    const i = events.findIndex((e) => e.id === id)
    if (i < 0) throw new ApiError('Événement introuvable', 404)
    events[i] = { ...events[i], ...patch, updatedAt: new Date().toISOString() }
    storage.set(KEYS.events, events)
    const mine = new Set(read<string[]>(KEYS.eventAttendance, user.id, []) ?? [])
    return delay({ ...events[i], attending: mine.has(id) }, 80)
  }

  async deleteEvent(id: string): Promise<void> {
    this.requireStaff()
    storage.set(KEYS.events, (storage.get<FitEvent[]>(KEYS.events) ?? []).filter((e) => e.id !== id))
    return delay(undefined, 80)
  }

  async toggleEventAttendance(id: string): Promise<FitEvent> {
    const user = this.currentUser()
    const events = storage.get<FitEvent[]>(KEYS.events) ?? []
    const event = events.find((e) => e.id === id)
    if (!event) throw new ApiError('Événement introuvable', 404)
    const mine = read<string[]>(KEYS.eventAttendance, user.id, []) ?? []
    const going = mine.includes(id)
    if (!going && event.capacity !== null && event.attendees >= event.capacity) {
      throw new ApiError('Cet événement est complet', 409)
    }
    write(KEYS.eventAttendance, going ? mine.filter((x) => x !== id) : [...mine, id], user.id)
    event.attendees = Math.max(0, event.attendees + (going ? -1 : 1))
    storage.set(KEYS.events, events)
    return delay({ ...event, attending: !going }, 80)
  }

  // ---------- Annonces ----------
  async getAnnouncements(includeExpired = false): Promise<Announcement[]> {
    this.currentUser()
    const now = Date.now()
    const list = (storage.get<Announcement[]>(KEYS.announcements) ?? [])
      .filter((a) => includeExpired || !a.expiresAt || new Date(a.expiresAt).getTime() > now)
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
    return delay(list)
  }

  async createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
    const author = this.requireStaff()
    const now = new Date().toISOString()
    const ann: Announcement = {
      ...input,
      id: uid('ann'),
      authorName: isAdmin(author) ? 'Équipe FitLife' : `${author.firstName} ${author.lastName}`.trim(),
      authorRole: author.role,
      createdAt: now,
      updatedAt: now,
    }
    storage.set(KEYS.announcements, [ann, ...(storage.get<Announcement[]>(KEYS.announcements) ?? [])])
    this.broadcast(author.id, 'announcement', ann.title, ann.content.slice(0, 140))
    return delay(ann)
  }

  async updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement> {
    this.requireStaff()
    const list = storage.get<Announcement[]>(KEYS.announcements) ?? []
    const i = list.findIndex((a) => a.id === id)
    if (i < 0) throw new ApiError('Annonce introuvable', 404)
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() }
    storage.set(KEYS.announcements, list)
    return delay(list[i], 80)
  }

  async deleteAnnouncement(id: string): Promise<void> {
    this.requireStaff()
    storage.set(KEYS.announcements, (storage.get<Announcement[]>(KEYS.announcements) ?? []).filter((a) => a.id !== id))
    return delay(undefined, 80)
  }

  // ---------- Coach IA ----------
  async getAiConversation(): Promise<ChatMessage[]> {
    return delay(read<ChatMessage[]>(KEYS.ai, this.currentUser().id, []) ?? [])
  }

  async sendAiMessage(text: string): Promise<ChatMessage[]> {
    const user = this.currentUser()
    const convo = read<ChatMessage[]>(KEYS.ai, user.id, []) ?? []
    convo.push({ id: uid('msg'), role: 'user', content: text, createdAt: new Date().toISOString() })
    const reply = this.aiReply(text, user)
    convo.push({ id: uid('msg'), role: 'assistant', content: reply, createdAt: new Date().toISOString() })
    write(KEYS.ai, convo, user.id)
    return delay(convo, 400)
  }

  private aiReply(input: string, user: User): string {
    const t = input.toLowerCase()
    const program = this.programFor(user)
    const todayWorkout = program.weeks[program.currentWeek - 1]?.workouts[0]
    if (/(20|15|30) min|peu de temps|court/.test(t)) {
      const w = todayWorkout
      return `Pas de souci ${user.firstName} ! Voici une séance express de 20 minutes tirée de ton programme :\n\n${w.exercises
        .slice(0, 4)
        .map((e, i) => `${i + 1}. ${e.name} — ${e.sets}×${e.reps || `${e.durationSeconds}s`}`)
        .join('\n')}\n\nÉchauffement 3 min, puis enchaîne les exercices avec 30 s de repos. Tu vas y arriver`
    }
    if (/repas|manger|recette|idée/.test(t)) {
      return `Voici une idée de repas équilibrée : poulet grillé + riz complet + légumes sautés (≈ 550 kcal, 40 g de protéines).\n\nPense à bien t’hydrater pendant le repas. Retrouve ton menu complet dans l’onglet Alimentation`
    }
    if (/motiv|décourag|flemme|pas envie/.test(t)) {
      return `Je comprends ${user.firstName}, les jours sans motivation arrivent à tout le monde. Commence par 10 minutes : le plus dur, c’est de démarrer. Tu ne le regretteras jamais`
    }
    if (/squat|pompe|exercice|comment/.test(t)) {
      return `Explication courte : garde le dos droit, le gainage actif et contrôle la descente. Qualité avant quantité ! Je te conseille de regarder la video de l’exercice dans ta séance du jour.`
    }
    if (/prog|gère|eau|hydrat/.test(t)) {
      const water = (read<WaterLog[]>(KEYS.water, user.id, []) ?? []).find((w) => w.date === todayKey())
      return `Ton objectif d’hydratation est de 2,5 L par jour. Aujourd’hui tu es à ${((water?.ml ?? 0) / 1000).toFixed(1)} L. Pense à boire un verre d’eau régulièrement`
    }
    return `Je suis ton Coach IA FitLife ! Je peux t’aider à adapter une séance, proposer une idée de repas, te motiver ou t’expliquer un exercice. Dis-m’en un peu plus\n\nRappel : je ne remplace pas un médecin ou un nutritionniste.`
  }

  // ---------- Subscription ----------
  async getPlans(): Promise<SubscriptionPlan[]> {
    return delay(subscriptionPlans, 60)
  }

  /** Met à jour le statut (expiré ?) et l'accès Premium de l'utilisateur. */
  private syncSubscription(userId: string): Subscription | null {
    const sub = read<Subscription>(KEYS.subscription, userId)
    if (sub && sub.status !== 'expired' && new Date(sub.renewsAt).getTime() < Date.now()) {
      sub.status = 'expired'
      write(KEYS.subscription, sub, userId)
      saveUsers(getUsers().map((u) => (u.id === userId ? { ...u, isPremium: false, premiumPlan: undefined } : u)))
    }
    return sub
  }

  async getSubscription(): Promise<Subscription | null> {
    return delay(this.syncSubscription(this.currentUser().id))
  }

  /** Active ou prolonge l'abonnement après un paiement réussi. */
  private activateSubscription(userId: string, payment: Payment): Subscription {
    const current = this.syncSubscription(userId)
    const now = Date.now()
    // Un réabonnement avant l'échéance prolonge la période en cours.
    const base = current && current.status !== 'expired' ? Math.max(now, new Date(current.renewsAt).getTime()) : now
    const days = payment.billing === 'monthly' ? 30 : 365
    const sub: Subscription = {
      plan: payment.plan,
      status: 'active',
      billing: payment.billing,
      startedAt: current && current.status !== 'expired' ? current.startedAt : new Date(now).toISOString(),
      renewsAt: new Date(base + days * 864e5).toISOString(),
      method: payment.method,
    }
    write(KEYS.subscription, sub, userId)
    saveUsers(getUsers().map((u) => (u.id === userId ? { ...u, isPremium: true, premiumPlan: payment.plan } : u)))
    this.pushNotification(
      userId,
      'encouragement',
      'Paiement confirmé',
      `${planById(payment.plan).name} actif jusqu’au ${new Date(sub.renewsAt).toLocaleDateString('fr-FR')}. Profite de tous tes avantages !`,
    )
    return sub
  }

  async subscribe(plan: SubscriptionPlan['id'], billing: Subscription['billing']): Promise<Subscription> {
    // Activation directe (sans paiement), conservée pour la compatibilité du contrat.
    const user = this.currentUser()
    const p = planById(plan)
    const sub = this.activateSubscription(user.id, {
      id: uid('pay'),
      reference: 'DIRECT',
      plan,
      billing,
      amount: billing === 'monthly' ? p.priceMonthly : p.priceYearly,
      currency: p.currency,
      method: 'card',
      status: 'succeeded',
      createdAt: new Date().toISOString(),
    })
    return delay(sub)
  }

  async cancelSubscription(): Promise<Subscription | null> {
    const user = this.currentUser()
    const sub = this.syncSubscription(user.id)
    if (sub && sub.status === 'active') {
      // Pas de renouvellement, mais l'accès reste ouvert jusqu'à la fin de la période payée.
      sub.status = 'cancelled'
      write(KEYS.subscription, sub, user.id)
    }
    return delay(sub)
  }

  async resumeSubscription(): Promise<Subscription | null> {
    const user = this.currentUser()
    const sub = this.syncSubscription(user.id)
    if (sub && sub.status === 'cancelled') {
      sub.status = 'active'
      write(KEYS.subscription, sub, user.id)
    }
    return delay(sub)
  }

  // ---------- Paiements (simulation d'un agrégateur Mobile Money / carte) ----------
  async startCheckout(input: CheckoutInput): Promise<Payment> {
    const user = this.currentUser()
    const plan = planById(input.plan)
    const method = paymentMethodById(input.method)
    let phoneMasked: string | null = null
    if (method.kind === 'mobile') {
      const digits = (input.phone ?? '').replace(/\D/g, '').replace(/^225/, '')
      if (digits.length < 8 || digits.length > 10) throw new ApiError('Numéro Mobile Money invalide', 400)
      phoneMasked = `${digits.slice(0, 2)} •• •• ${digits.slice(-2)}`
    }
    const now = new Date()
    const payment: Payment = {
      id: uid('pay'),
      reference: `FL-${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
      plan: plan.id,
      billing: input.billing,
      amount: input.billing === 'monthly' ? plan.priceMonthly : plan.priceYearly,
      currency: plan.currency,
      method: method.id,
      phoneMasked,
      status: 'pending',
      createdAt: now.toISOString(),
    }
    // Démo : un numéro se terminant par 00 simule un paiement refusé.
    if (phoneMasked?.endsWith('00')) payment.failureReason = 'Solde insuffisant ou paiement refusé par l’opérateur.'
    write(KEYS.payments, [payment, ...(read<Payment[]>(KEYS.payments, user.id, []) ?? [])], user.id)
    return delay(payment, 400)
  }

  async getPayment(id: string): Promise<Payment> {
    const user = this.currentUser()
    const list = read<Payment[]>(KEYS.payments, user.id, []) ?? []
    const payment = list.find((p) => p.id === id)
    if (!payment) throw new ApiError('Paiement introuvable', 404)
    // Simulation : l'opérateur répond ~4 s après la demande.
    if (payment.status === 'pending' && Date.now() - new Date(payment.createdAt).getTime() > 4000) {
      if (payment.failureReason) {
        payment.status = 'failed'
      } else {
        payment.status = 'succeeded'
        payment.paidAt = new Date().toISOString()
        this.activateSubscription(user.id, payment)
      }
      write(KEYS.payments, list, user.id)
    }
    return delay(payment, 120)
  }

  async getPayments(): Promise<Payment[]> {
    return delay(read<Payment[]>(KEYS.payments, this.currentUser().id, []) ?? [])
  }

  // ---------- Menu du jour ----------
  async getMenu(from: string, to: string): Promise<MenuItem[]> {
    this.currentUser()
    const order = { breakfast: 0, lunch: 1, snack: 2, dinner: 3 }
    return delay(
      (storage.get<MenuItem[]>(KEYS.menu) ?? [])
        .filter((m) => m.date >= from && m.date <= to)
        .sort((a, b) => a.date.localeCompare(b.date) || order[a.mealType] - order[b.mealType]),
    )
  }

  async createMenuItem(input: MenuItemInput): Promise<MenuItem> {
    const author = this.requireStaff()
    const item: MenuItem = {
      ...input,
      id: uid('menu'),
      createdBy: `${author.firstName} ${author.lastName}`.trim(),
      updatedAt: new Date().toISOString(),
    }
    storage.set(KEYS.menu, [...(storage.get<MenuItem[]>(KEYS.menu) ?? []), item])
    return delay(item, 80)
  }

  async updateMenuItem(id: string, patch: Partial<MenuItemInput>): Promise<MenuItem> {
    this.requireStaff()
    const list = storage.get<MenuItem[]>(KEYS.menu) ?? []
    const i = list.findIndex((m) => m.id === id)
    if (i < 0) throw new ApiError('Aliment introuvable', 404)
    list[i] = { ...list[i], ...patch, updatedAt: new Date().toISOString() }
    storage.set(KEYS.menu, list)
    return delay(list[i], 80)
  }

  async deleteMenuItem(id: string): Promise<void> {
    this.requireStaff()
    storage.set(KEYS.menu, (storage.get<MenuItem[]>(KEYS.menu) ?? []).filter((m) => m.id !== id))
    return delay(undefined, 80)
  }

  // ---------- Notifications ----------
  async getNotifications(): Promise<Notification[]> {
    return delay(read<Notification[]>(KEYS.notifications, this.currentUser().id, []) ?? [])
  }

  async markNotificationRead(id: string): Promise<Notification[]> {
    const user = this.currentUser()
    const list = (read<Notification[]>(KEYS.notifications, user.id, []) ?? []).map((n) =>
      n.id === id ? { ...n, read: true } : n,
    )
    write(KEYS.notifications, list, user.id)
    return delay(list, 50)
  }

  async markAllNotificationsRead(): Promise<Notification[]> {
    const user = this.currentUser()
    const list = (read<Notification[]>(KEYS.notifications, user.id, []) ?? []).map((n) => ({
      ...n,
      read: true,
    }))
    write(KEYS.notifications, list, user.id)
    return delay(list, 50)
  }

  // ---------- Progress ----------
  async getProgress(range: ProgressRange): Promise<ProgressSummary> {
    const user = this.currentUser()
    const history = read<ProgressPoint[]>(KEYS.progress, user.id, []) ?? []
    const days = range === '7d' ? 7 : range === '30d' ? 30 : range === '3m' ? 90 : range === '6m' ? 180 : 365
    const points = history.filter((p) => Date.now() - new Date(p.date).getTime() <= days * 864e5)
    const activities = this.activities(user.id).filter(
      (a) => Date.now() - new Date(a.startedAt).getTime() <= days * 864e5,
    )
    const stepsMap = read<Record<string, number>>(KEYS.steps, user.id, {}) ?? {}
    const totalSteps = Object.entries(stepsMap)
      .filter(([d]) => Date.now() - new Date(d).getTime() <= days * 864e5)
      .reduce((s, [, v]) => s + v, 0)
    const sessions = (read<string[]>(KEYS.completedWorkouts, user.id, []) ?? []).length
    const waterLogs = read<WaterLog[]>(KEYS.water, user.id, []) ?? []
    const avgWater = waterLogs.length
      ? Math.round(waterLogs.reduce((s, w) => s + w.ml, 0) / waterLogs.length)
      : 0
    const weights = points.map((p) => p.weight).filter((w): w is number => typeof w === 'number')
    return delay({
      range,
      points,
      weightStart: weights[0] ?? user.weight,
      weightEnd: weights[weights.length - 1] ?? user.weight,
      totalDistanceKm: round(activities.reduce((s, a) => s + a.distanceKm, 0), 1),
      totalSessions: sessions,
      avgWaterMl: avgWater,
      totalSteps,
    })
  }

  async addWeight(value: number): Promise<ProgressSummary> {
    const user = this.currentUser()
    const history = read<ProgressPoint[]>(KEYS.progress, user.id, []) ?? []
    history.push({ date: new Date().toISOString(), weight: value })
    write(KEYS.progress, history, user.id)
    const users = getUsers().map((u) => (u.id === user.id ? { ...u, weight: value } : u))
    saveUsers(users)
    return this.getProgress('6m')
  }

  // ---------- Admin ----------
  private requireAdmin(): User {
    const user = this.currentUser()
    if (!isAdmin(user)) throw new ApiError('Accès réservé aux administrateurs', 403)
    return user
  }

  private requireSuperAdmin(): User {
    const user = this.currentUser()
    if (!isSuperAdmin(user)) throw new ApiError('Accès réservé au super administrateur', 403)
    return user
  }

  async getAdminStats(): Promise<AdminStats> {
    this.requireAdmin()
    const users = getUsers()
    const members = users.filter((u) => u.role === 'user')
    const activities = users.flatMap((u) => this.activities(u.id))
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)
    const revenue = users
      .flatMap((u) => read<Payment[]>(KEYS.payments, u.id, []) ?? [])
      .filter((p) => p.status === 'succeeded' && p.paidAt && new Date(p.paidAt) >= monthStart)
      .reduce((s, p) => s + p.amount, 0)
    const since = Date.now() - 30 * 864e5
    return delay({
      users: members.length,
      premiumUsers: members.filter((u) => u.isPremium).length,
      revenue,
      lives: (storage.get<LiveSession[]>(KEYS.lives) ?? []).length,
      sessions: users.reduce((s, u) => s + (read<string[]>(KEYS.completedWorkouts, u.id, []) ?? []).length, 0),
      totalKm: round(activities.filter((a) => a.reviewStatus === 'validated').reduce((s, a) => s + a.distanceKm, 0), 1),
      activeUsers: new Set(activities.filter((a) => new Date(a.startedAt).getTime() > since).map((a) => a.userId)).size,
    })
  }

  // ---------- Codes promo ----------
  private promoCodes(): PromoCode[] {
    return storage.get<PromoCode[]>('promoCodes') ?? []
  }

  async getPromoCodes(): Promise<PromoCode[]> {
    this.requireStaff()
    return delay(this.promoCodes())
  }

  async createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
    const me = this.requireStaff()
    const days = Math.round(Number(input.days))
    if (!(days >= 1 && days <= 3650)) throw new ApiError('Durée invalide : entre 1 et 3650 jours.', 400)
    const maxUses = input.maxUses ? Math.round(Number(input.maxUses)) : null
    if (maxUses !== null && !(maxUses >= 1)) throw new ApiError('Nombre d’utilisations invalide.', 400)
    if (input.expiresAt && new Date(input.expiresAt).getTime() < Date.now()) throw new ApiError('La date limite doit être dans le futur.', 400)
    const list = this.promoCodes()
    let code = (input.code ?? '').trim().toUpperCase()
    if (!code) {
      const alphabet = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'
      do {
        const bytes = crypto.getRandomValues(new Uint8Array(8))
        code = 'FIT-' + Array.from(bytes, (b) => alphabet[b % alphabet.length]).join('')
      } while (list.some((c) => c.code === code))
    } else if (!/^[A-Z0-9-]{4,32}$/.test(code)) {
      throw new ApiError('Code invalide : 4 à 32 lettres, chiffres ou tirets.', 400)
    }
    if (list.some((c) => c.code === code)) throw new ApiError('Ce code existe déjà.', 409)
    const promo: PromoCode = {
      code,
      days,
      maxUses,
      uses: 0,
      expiresAt: input.expiresAt ? new Date(input.expiresAt).toISOString() : null,
      note: input.note?.trim() || null,
      active: true,
      createdByName: `${me.firstName} ${me.lastName}`.trim(),
      createdAt: new Date().toISOString(),
    }
    storage.set('promoCodes', [promo, ...list])
    return delay(promo, 80)
  }

  async setPromoCodeActive(code: string, active: boolean): Promise<PromoCode> {
    this.requireStaff()
    const list = this.promoCodes()
    const promo = list.find((c) => c.code === code)
    if (!promo) throw new ApiError('Code promo introuvable', 404)
    const updated = { ...promo, active }
    storage.set('promoCodes', list.map((c) => (c.code === code ? updated : c)))
    return delay(updated, 60)
  }

  async deletePromoCode(code: string): Promise<void> {
    this.requireStaff()
    storage.set('promoCodes', this.promoCodes().filter((c) => c.code !== code))
    return delay(undefined, 60)
  }

  async redeemPromoCode(raw: string): Promise<PromoRedemption> {
    const me = this.currentUser()
    const code = raw.replace(/\s+/g, '').toUpperCase()
    const list = this.promoCodes()
    const promo = list.find((c) => c.code === code)
    const used = storage.get<{ code: string; userId: string }[]>('promoRedemptions') ?? []
    if (!promo) throw new ApiError('Code promo inconnu.', 400)
    if (!promo.active) throw new ApiError('Ce code promo a été désactivé.', 400)
    if (promo.expiresAt && new Date(promo.expiresAt).getTime() < Date.now()) throw new ApiError('Ce code promo a expiré.', 400)
    if (promo.maxUses !== null && promo.uses >= promo.maxUses) throw new ApiError('Ce code promo a déjà été utilisé le nombre de fois prévu.', 400)
    if (used.some((r) => r.code === code && r.userId === me.id)) throw new ApiError('Tu as déjà utilisé ce code.', 400)
    storage.set('promoRedemptions', [...used, { code, userId: me.id }])
    storage.set('promoCodes', list.map((c) => (c.code === code ? { ...c, uses: c.uses + 1 } : c)))
    const current = read<Subscription>(KEYS.subscription, me.id)
    const running = current && current.status !== 'expired' && new Date(current.renewsAt).getTime() > Date.now()
    const base = running ? new Date(current.renewsAt).getTime() : Date.now()
    const renewsAt = new Date(base + promo.days * 864e5).toISOString()
    write(
      KEYS.subscription,
      running && current.status === 'active'
        ? { ...current, renewsAt }
        : { plan: 'premium', status: 'cancelled', billing: promo.days >= 365 ? 'yearly' : 'monthly', startedAt: new Date().toISOString(), renewsAt, method: null },
      me.id,
    )
    const user: User = { ...me, isPremium: true, premiumPlan: 'premium' }
    saveUsers(getUsers().map((u) => (u.id === me.id ? user : u)))
    this.pushNotification(me.id, 'encouragement', 'Premium activé', `Code ${code} : Premium offert pendant ${promo.days} jours, jusqu’au ${new Date(renewsAt).toLocaleDateString('fr-FR')}.`)
    return delay({ days: promo.days, premiumUntil: renewsAt, user }, 120)
  }

  // ---------- Messagerie avec les coachs ----------
  private coachMessages(): CoachMessage[] {
    return storage.get<CoachMessage[]>('coachMessages') ?? []
  }

  private thread(memberId: string): CoachMessage[] {
    return this.coachMessages().filter((m) => m.memberId === memberId)
  }

  async getCoachMessages(): Promise<CoachMessage[]> {
    const me = this.currentUser()
    storage.set('coachMessages', this.coachMessages().map((m) => (m.memberId === me.id && m.fromCoach ? { ...m, read: true } : m)))
    return delay(this.thread(me.id), 60)
  }

  async sendCoachMessage(text: string): Promise<CoachMessage[]> {
    const me = this.currentUser()
    const content = text.trim().slice(0, 2000)
    if (!content) throw new ApiError('Message vide', 400)
    const name = `${me.firstName} ${me.lastName}`.trim()
    const msg: CoachMessage = {
      id: uid('cm'), memberId: me.id, senderId: me.id, senderName: name, avatarUrl: me.avatarUrl,
      fromCoach: false, text: content, read: false, createdAt: new Date().toISOString(),
    }
    storage.set('coachMessages', [...this.coachMessages(), msg])
    for (const u of getUsers()) {
      if (isStaff(u) && u.id !== me.id) this.pushNotification(u.id, 'announcement', `Message de ${name}`, content.slice(0, 140))
    }
    return delay(this.thread(me.id), 80)
  }

  async getCoachUnread(): Promise<number> {
    const me = this.currentUser()
    return delay(this.thread(me.id).filter((m) => m.fromCoach && !m.read).length, 30)
  }

  async getCoachInbox(): Promise<CoachThread[]> {
    this.requireStaff()
    const users = new Map(getUsers().map((u) => [u.id, u]))
    const byMember = new Map<string, CoachMessage[]>()
    for (const m of this.coachMessages()) byMember.set(m.memberId, [...(byMember.get(m.memberId) ?? []), m])
    const threads: CoachThread[] = []
    for (const [memberId, list] of byMember) {
      const u = users.get(memberId)
      if (!u) continue
      const last = list[list.length - 1]
      threads.push({
        memberId,
        memberName: `${u.firstName} ${u.lastName}`.trim(),
        avatarUrl: u.avatarUrl,
        isPremium: !!u.isPremium,
        lastText: last.text.slice(0, 160),
        lastFromCoach: last.fromCoach,
        lastAt: last.createdAt,
        unread: list.filter((m) => !m.fromCoach && !m.read).length,
      })
    }
    return delay(threads.sort((a, b) => b.lastAt.localeCompare(a.lastAt)), 60)
  }

  async getCoachThread(memberId: string): Promise<CoachMessage[]> {
    this.requireStaff()
    storage.set('coachMessages', this.coachMessages().map((m) => (m.memberId === memberId && !m.fromCoach ? { ...m, read: true } : m)))
    return delay(this.thread(memberId), 60)
  }

  async replyToMember(memberId: string, text: string): Promise<CoachMessage[]> {
    const me = this.requireStaff()
    const content = text.trim().slice(0, 2000)
    if (!content) throw new ApiError('Message vide', 400)
    if (!getUsers().some((u) => u.id === memberId)) throw new ApiError('Utilisateur introuvable', 404)
    const name = `${me.firstName} ${me.lastName}`.trim()
    const msg: CoachMessage = {
      id: uid('cm'), memberId, senderId: me.id, senderName: name, avatarUrl: me.avatarUrl,
      fromCoach: true, text: content, read: false, createdAt: new Date().toISOString(),
    }
    storage.set('coachMessages', [...this.coachMessages().map((m) => (m.memberId === memberId && !m.fromCoach ? { ...m, read: true } : m)), msg])
    this.pushNotification(memberId, 'encouragement', `${name} t’a répondu`, content.slice(0, 140))
    return delay(this.thread(memberId), 80)
  }

  async getAdminUsers(): Promise<AdminUserRow[]> {
    this.requireAdmin()
    return delay(
      getUsers().map((u) => ({
        id: u.id,
        name: `${u.firstName} ${u.lastName}`,
        email: u.email,
        role: u.role,
        isPremium: u.isPremium,
        createdAt: u.createdAt,
      })),
    )
  }

  // ---------- Super admin ----------
  private managed(u: User): ManagedUser {
    const acts = this.activities(u.id).filter((a) => a.status === 'finished')
    const sub = read<Subscription>(KEYS.subscription, u.id)
    return {
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      phone: u.phone,
      avatarUrl: u.avatarUrl,
      role: u.role,
      isPremium: !!u.isPremium,
      premiumUntil: sub && sub.status !== 'expired' ? sub.renewsAt : null,
      createdAt: u.createdAt,
      activities: acts.length,
      totalKm: round(acts.reduce((t, a) => t + a.distanceKm, 0), 1),
      lastActivityAt: acts[0]?.startedAt ?? null,
      ...this.dossierFields(u),
    }
  }

  /** Informations d'inscription et de questionnaire, pour le dossier membre du super admin. */
  private dossierFields(u: User): Partial<ManagedUser> {
    const p = this.prefs(u.id)
    return {
      birthDate: u.birthDate,
      sex: u.sex,
      height: u.height,
      weight: u.weight,
      goal: p.goal,
      level: p.level,
      daysPerWeek: p.daysPerWeek,
      sessionMinutes: p.sessionMinutes,
      equipment: p.equipment,
      allergies: p.allergies,
      dietRestrictions: p.dietRestrictions,
    }
  }

  async getAllUsers(): Promise<ManagedUser[]> {
    this.requireSuperAdmin()
    return delay(
      getUsers()
        .map((u) => this.managed(u))
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    )
  }

  async setUserRole(id: string, role: User['role']): Promise<ManagedUser> {
    const me = this.requireSuperAdmin()
    const users = getUsers()
    const target = users.find((u) => u.id === id)
    if (!target) throw new ApiError('Utilisateur introuvable', 404)
    if (target.id === me.id && role !== 'superadmin') throw new ApiError('Tu ne peux pas retirer ton propre rôle de super admin', 409)
    const updated = { ...target, role }
    saveUsers(users.map((u) => (u.id === id ? updated : u)))
    return delay(this.managed(updated), 80)
  }

  async setUserPremium(id: string, days: number): Promise<ManagedUser> {
    this.requireSuperAdmin()
    const users = getUsers()
    const target = users.find((u) => u.id === id)
    if (!target) throw new ApiError('Utilisateur introuvable', 404)
    if (days > 0) {
      const current = read<Subscription>(KEYS.subscription, id)
      const base = current && current.status !== 'expired' ? Math.max(Date.now(), new Date(current.renewsAt).getTime()) : Date.now()
      const sub: Subscription = {
        plan: 'premium',
        status: 'cancelled', // offert : pas de renouvellement automatique
        billing: days >= 365 ? 'yearly' : 'monthly',
        startedAt: current && current.status !== 'expired' ? current.startedAt : new Date().toISOString(),
        renewsAt: new Date(base + days * 864e5).toISOString(),
        method: null,
      }
      write(KEYS.subscription, sub, id)
      this.pushNotification(id, 'encouragement', 'Premium offert', `L’équipe FitLife t’offre ${days} jours de Premium. Profite de tous les avantages !`)
    } else {
      const current = read<Subscription>(KEYS.subscription, id)
      if (current) write(KEYS.subscription, { ...current, status: 'expired', renewsAt: new Date().toISOString() }, id)
    }
    const updated = { ...target, isPremium: days > 0, premiumPlan: days > 0 ? ('premium' as const) : undefined }
    saveUsers(users.map((u) => (u.id === id ? updated : u)))
    return delay(this.managed(updated), 80)
  }

  async deleteUser(id: string): Promise<void> {
    const me = this.requireSuperAdmin()
    if (id === me.id) throw new ApiError('Tu ne peux pas supprimer ton propre compte', 409)
    const users = getUsers()
    const target = users.find((u) => u.id === id)
    if (!target) throw new ApiError('Utilisateur introuvable', 404)
    if (target.role === 'superadmin' && users.filter((u) => u.role === 'superadmin').length <= 1) {
      throw new ApiError('Impossible de supprimer le dernier super admin', 409)
    }
    saveUsers(users.filter((u) => u.id !== id))
    markUserDeleted(id)
    // Données personnelles (toutes les clés « nom:idUtilisateur »)
    for (const k of storage.keys().filter((k) => k.endsWith(`:${id}`))) storage.remove(k)
    // Contenus publics
    storage.set(KEYS.posts, (storage.get<CommunityPost[]>(KEYS.posts) ?? []).filter((post) => post.userId !== id))
    storage.set(KEYS.liveMessages, (storage.get<LiveMessage[]>(KEYS.liveMessages) ?? []).filter((m) => m.userId !== id))
    return delay(undefined, 120)
  }

  async getPendingActivities(): Promise<Activity[]> {
    this.requireAdmin()
    const pending = getUsers().flatMap((u) =>
      this.activities(u.id)
        .filter((a) => a.status === 'finished' && a.reviewStatus === 'pending')
        .map((a) => ({ ...a, userName: a.userName ?? `${u.firstName} ${u.lastName}` })),
    )
    return delay(pending.sort((a, b) => b.startedAt.localeCompare(a.startedAt)))
  }

  async reviewActivity(id: string, decision: 'validated' | 'rejected'): Promise<Activity> {
    this.requireAdmin()
    // L'activité peut appartenir à n'importe quel membre.
    const owner = getUsers().find((u) => this.activities(u.id).some((a) => a.id === id))
    if (!owner) throw new ApiError('Activité introuvable', 404)
    const list = this.activities(owner.id)
    const idx = list.findIndex((a) => a.id === id)
    list[idx] = { ...list[idx], reviewStatus: decision, reviewReason: decision === 'rejected' ? 'Rejetée par l’administrateur' : undefined }
    this.saveActivities(owner.id, list)
    if (decision === 'validated') this.awardBadges(owner.id)
    return delay(list[idx])
  }
}

export const mockAdapter = new MockAdapter()
