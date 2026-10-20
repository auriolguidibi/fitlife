export type ID = string

export type Sex = 'male' | 'female' | 'other'

export type UserRole = 'user' | 'coach' | 'admin' | 'superadmin'

export type GoalType =
  | 'weight_loss'
  | 'muscle_gain'
  | 'endurance'
  | 'fitness'
  | 'wellness'

export type Level = 'beginner' | 'intermediate' | 'advanced'

export type Equipment =
  | 'none'
  | 'dumbbells'
  | 'bands'
  | 'mat'
  | 'machine'
  | 'gym'

export interface User {
  id: ID
  firstName: string
  lastName: string
  email: string
  phone: string
  birthDate: string
  sex: Sex
  height: number
  weight: number
  avatarUrl?: string
  role: UserRole
  isPremium: boolean
  premiumPlan?: 'essential' | 'premium'
  createdAt: string
}

export interface Profile {
  bio?: string
  city?: string
  level: Level
  streakDays: number
  weeklyGoal: number
  createdAt: string
}

export interface Goal {
  id: ID
  type: GoalType
  label: string
  emoji?: string
}

export interface UserPreferences {
  goal: GoalType
  level: Level
  daysPerWeek: number
  sessionMinutes: number
  equipment: Equipment[]
  favoriteFoods: string[]
  avoidedFoods: string[]
  allergies: string[]
  dietRestrictions: string[]
  budget: 'low' | 'medium' | 'high'
  mealsPerDay: 2 | 3 | 4 | 5
  onboarded: boolean
}

export interface Exercise {
  id: ID
  name: string
  description: string
  muscles: string[]
  sets: number
  reps: number
  restSeconds: number
  durationSeconds?: number
  gifUrl?: string
  tips: string[]
}

export interface Workout {
  id: ID
  name: string
  type: 'full_body' | 'cardio' | 'legs' | 'abs' | 'upper_body' | 'mobility'
  duration: number
  difficulty: Level
  equipment: Equipment[]
  calories: number
  exercises: Exercise[]
  completed?: boolean
}

export interface WeeklyPlan {
  week: number
  workouts: Workout[]
}

export interface WorkoutProgram {
  id: ID
  userId: ID
  goal: GoalType
  durationWeeks: number
  currentWeek: number
  progress: number
  daysPerWeek: number
  createdAt: string
  weeks: WeeklyPlan[]
}

export interface Macros {
  protein: number
  carbs: number
  fat: number
}

export interface Meal {
  id: ID
  name: string
  type: 'breakfast' | 'lunch' | 'snack' | 'dinner'
  emoji?: string
  imageUrl?: string
  calories: number
  macros: Macros
  ingredients: string[]
}

export interface MealLogEntry {
  id: ID
  date: string
  mealId?: ID
  name: string
  type: Meal['type']
  calories: number
  macros: Macros
}

export interface DayMenu {
  day: string
  meals: Meal[]
}

export interface NutritionPlan {
  id: ID
  userId: ID
  goal: GoalType
  dailyCalories: number
  targetMacros: Macros
  week: DayMenu[]
  hydrationTarget: number
}

export interface ShoppingItem {
  id: ID
  name: string
  quantity: string
  category: string
  checked: boolean
}

export interface WaterLog {
  date: string
  ml: number
}

export type ActivityType = 'walk' | 'run' | 'bike' | 'other'

export interface GpsPoint {
  lat: number
  lng: number
  timestamp: number
  speed: number
}

export type ActivityStatus = 'active' | 'paused' | 'finished'

export type ReviewStatus = 'validated' | 'pending' | 'rejected'

export interface Activity {
  id: ID
  userId: ID
  userName?: string
  type: ActivityType
  status: ActivityStatus
  startedAt: string
  finishedAt?: string
  durationSeconds: number
  movingSeconds: number
  distanceKm: number
  steps: number
  avgSpeedKmh: number
  maxSpeedKmh: number
  calories: number
  route: GpsPoint[]
  reviewStatus: ReviewStatus
  reviewReason?: string
}

export type LeaderboardPeriod = 'daily' | 'weekly' | 'monthly' | 'allTime'

export interface LeaderboardEntry {
  rank: number
  userId: ID
  name: string
  avatarUrl?: string
  distanceKm: number
  isCurrentUser?: boolean
}

export interface Leaderboard {
  period: LeaderboardPeriod
  entries: LeaderboardEntry[]
  currentUserRank?: LeaderboardEntry
  nextTargetKm?: number
  nextTargetName?: string
}

export type ChallengeMetric = 'distance' | 'steps' | 'sessions' | 'days'

export interface Challenge {
  id: ID
  title: string
  emoji?: string
  description: string
  metric: ChallengeMetric
  target: number
  unit: string
  days: number
  participants: number
  startsAt: string
  endsAt: string
  badgeId?: ID
}

export interface ChallengeParticipation {
  challengeId: ID
  userId: ID
  progress: number
  joinedAt: string
  completed: boolean
}

export interface Badge {
  id: ID
  name: string
  emoji?: string
  description: string
  requirement: string
  tier: 'bronze' | 'silver' | 'gold' | 'platinum'
}

export interface UserBadge {
  badgeId: ID
  userId: ID
  earnedAt: string
}

export interface Coach {
  id: ID
  name: string
  avatarUrl?: string
  specialty: string
  bio: string
  followers: number
  rating: number
  liveCount: number
}

export type LiveStatus = 'scheduled' | 'live' | 'ended'

export interface LiveSession {
  id: ID
  coachId: ID
  coachName: string
  coachAvatarUrl?: string
  title: string
  description: string
  status: LiveStatus
  scheduledAt: string
  durationMinutes: number
  viewers: number
  level: Level
  premiumOnly: boolean
  thumbnailUrl?: string
  /** Lien du direct (YouTube Live, Zoom, Google Meet, Facebook…). */
  streamUrl?: string | null
  /** Utilisateur qui diffuse sa caméra depuis l'app (direct intégré). */
  hostUserId?: string | null
  /** Caméra de l'hôte allumée. */
  cameraOn?: boolean
}

/** Message de connexion WebRTC entre l'hôte d'un live et un spectateur. */
export interface LiveSignal {
  from: string
  kind: 'join' | 'offer' | 'answer' | 'leave'
  payload?: unknown
}

export interface LiveMessage {
  id: ID
  liveId: ID
  userId: ID
  userName: string
  avatarUrl?: string
  text: string
  createdAt: string
  isCoach?: boolean
  isQuestion?: boolean
}

export interface CommunityPost {
  id: ID
  userId: ID
  userName: string
  avatarUrl?: string
  content: string
  createdAt: string
  likes: number
  likedByMe: boolean
  comments: Comment[]
  activitySummary?: { distanceKm: number; type: ActivityType }
}

export interface Comment {
  id: ID
  postId: ID
  userId: ID
  userName: string
  avatarUrl?: string
  text: string
  createdAt: string
}

export interface SubscriptionPlan {
  id: 'essential' | 'premium'
  name: string
  priceMonthly: number
  priceYearly: number
  currency: string
  features: string[]
  highlighted?: boolean
}

export interface Subscription {
  plan: SubscriptionPlan['id']
  /** cancelled = résilié : reste actif jusqu'à renewsAt, sans renouvellement. */
  status: 'active' | 'cancelled' | 'expired'
  billing: 'monthly' | 'yearly'
  startedAt: string
  renewsAt: string
  /** Moyen de paiement utilisé pour le dernier règlement. */
  method?: PaymentMethod | null
}

export type NotificationType =
  | 'workout'
  | 'hydration'
  | 'meal'
  | 'live'
  | 'leaderboard'
  | 'badge'
  | 'challenge'
  | 'encouragement'
  | 'announcement'
  | 'event'

export interface Notification {
  id: ID
  userId: ID
  type: NotificationType
  title: string
  body: string
  createdAt: string
  read: boolean
}

export interface ChatMessage {
  id: ID
  role: 'user' | 'assistant'
  content: string
  createdAt: string
}

export interface ProgressPoint {
  date: string
  weight?: number
  distanceKm?: number
  sessions?: number
  calories?: number
  waterMl?: number
  steps?: number
  chest?: number
  waist?: number
  hips?: number
}

export interface ProgressSummary {
  range: ProgressRange
  points: ProgressPoint[]
  weightStart: number
  weightEnd: number
  totalDistanceKm: number
  totalSessions: number
  avgWaterMl: number
  totalSteps: number
}

export type ProgressRange = '7d' | '30d' | '3m' | '6m' | '1y'

export interface AdminStats {
  users: number
  premiumUsers: number
  revenue: number
  lives: number
  sessions: number
  totalKm: number
  activeUsers: number
}

export interface AuthSession {
  token: string
  user: User
  preferences: UserPreferences
}

export interface RegisterPayload {
  firstName: string
  lastName: string
  email: string
  phone: string
  password: string
  birthDate: string
  sex: Sex
  height: number
  weight: number
}

// ---------- Événements & annonces (gérés par les coachs / admins) ----------

export type EventCategory = 'workshop' | 'run' | 'challenge' | 'meetup' | 'webinar'

export interface FitEvent {
  id: ID
  title: string
  description: string
  category: EventCategory
  startsAt: string
  durationMinutes: number
  /** Adresse, ou lien / plateforme si en ligne. */
  location: string
  online: boolean
  /** Nombre de places ; null = illimité. */
  capacity: number | null
  attendees: number
  /** L'utilisateur courant est inscrit. */
  attending: boolean
  coverUrl?: string | null
  createdBy: string
  createdAt: string
  updatedAt: string
}

export type EventInput = Pick<
  FitEvent,
  'title' | 'description' | 'category' | 'startsAt' | 'durationMinutes' | 'location' | 'online' | 'capacity'
> & { coverUrl?: string | null }

export type AnnouncementPriority = 'info' | 'important' | 'urgent'

export interface Announcement {
  id: ID
  title: string
  content: string
  priority: AnnouncementPriority
  pinned: boolean
  /** Date après laquelle l'annonce n'est plus affichée aux membres. */
  expiresAt: string | null
  authorName: string
  authorRole: UserRole
  createdAt: string
  updatedAt: string
}

export type AnnouncementInput = Pick<Announcement, 'title' | 'content' | 'priority' | 'pinned' | 'expiresAt'>

// ---------- Menu du jour (aliments publiés par les coachs / admins) ----------

export interface MenuItem {
  id: ID
  /** Jour concerné, format YYYY-MM-DD. */
  date: string
  mealType: Meal['type']
  name: string
  description: string
  calories: number
  protein: number
  carbs: number
  fat: number
  imageUrl?: string | null
  createdBy: string
  updatedAt: string
}

export type MenuItemInput = Pick<
  MenuItem,
  'date' | 'mealType' | 'name' | 'description' | 'calories' | 'protein' | 'carbs' | 'fat'
> & { imageUrl?: string | null }

// ---------- Paiements ----------

export type PaymentMethod = 'orange_money' | 'mtn_momo' | 'moov_money' | 'wave' | 'card'

export type PaymentStatus = 'pending' | 'succeeded' | 'failed'

export interface Payment {
  id: ID
  /** Référence affichée sur le reçu. */
  reference: string
  plan: SubscriptionPlan['id']
  billing: Subscription['billing']
  amount: number
  currency: string
  method: PaymentMethod
  /** Numéro Mobile Money masqué (ex. 07 •• •• 45). */
  phoneMasked?: string | null
  status: PaymentStatus
  failureReason?: string | null
  createdAt: string
  paidAt?: string | null
  /** Lien vers la page de paiement sécurisée FedaPay (mode serveur). */
  checkoutUrl?: string | null
}

export interface CheckoutInput {
  plan: SubscriptionPlan['id']
  billing: Subscription['billing']
  method: PaymentMethod
  /** Obligatoire pour le Mobile Money. */
  phone?: string
}

/** Code promo : accès Premium pendant `days` jours (créé par un coach ou un admin). */
export interface PromoCode {
  code: string
  days: number
  /** null : utilisations illimitées. */
  maxUses: number | null
  uses: number
  expiresAt: string | null
  note?: string | null
  active: boolean
  createdByName: string
  createdAt: string
}

export interface PromoCodeInput {
  /** Vide : code généré automatiquement. */
  code?: string
  days: number
  maxUses?: number | null
  expiresAt?: string | null
  note?: string
}

export interface PromoRedemption {
  days: number
  premiumUntil: string
  user: User
}

/** Message entre un membre et l'équipe des coachs. */
export interface CoachMessage {
  id: ID
  memberId: ID
  senderId: ID
  senderName: string
  avatarUrl?: string | null
  fromCoach: boolean
  text: string
  read: boolean
  createdAt: string
}

/** Conversation vue par le coach (boîte de réception). */
export interface CoachThread {
  memberId: ID
  memberName: string
  avatarUrl?: string | null
  isPremium: boolean
  lastText: string
  lastFromCoach: boolean
  lastAt: string
  unread: number
}
