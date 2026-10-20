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
  ActivityType,
  AuthSession,
  Badge,
  ChatMessage,
  Challenge,
  ChallengeParticipation,
  CommunityPost,
  ID,
  Leaderboard,
  LeaderboardPeriod,
  LiveMessage,
  LiveSession,
  LiveSignal,
  MealLogEntry,
  Notification,
  NutritionPlan,
  ProgressRange,
  ProgressSummary,
  RegisterPayload,
  ShoppingItem,
  Subscription,
  SubscriptionPlan,
  User,
  UserBadge,
  UserPreferences,
  WaterLog,
  WorkoutProgram,
} from '@/types'

export interface CompleteWorkoutPayload {
  workoutId: string
  workoutName: string
  durationSeconds: number
  calories: number
}

export interface StartActivityPayload {
  type: ActivityType
}

export interface UpdateActivityPayload {
  route?: Activity['route']
  distanceKm?: number
  steps?: number
  movingSeconds?: number
  durationSeconds?: number
  avgSpeedKmh?: number
  maxSpeedKmh?: number
  calories?: number
  status?: Activity['status']
}

export interface AdminUserRow {
  id: ID
  name: string
  email: string
  role: User['role']
  isPremium: boolean
  createdAt: string
}

/** Fiche membre complète (espace super admin). */
export interface ManagedUser {
  id: ID
  firstName: string
  lastName: string
  email: string
  phone?: string
  avatarUrl?: string
  role: User['role']
  isPremium: boolean
  premiumUntil: string | null
  createdAt: string
  activities: number
  totalKm: number
  lastActivityAt: string | null
  /** Informations données à l'inscription et au questionnaire (dossier membre). */
  birthDate?: string
  sex?: User['sex']
  height?: number
  weight?: number
  goal?: UserPreferences['goal']
  level?: UserPreferences['level']
  daysPerWeek?: number
  sessionMinutes?: number
  equipment?: string[]
  allergies?: string[]
  dietRestrictions?: string[]
  city?: string
}

export interface AdminStats {
  users: number
  premiumUsers: number
  revenue: number
  lives: number
  sessions: number
  totalKm: number
  activeUsers: number
}

export interface BadgeCollection {
  all: Badge[]
  earned: UserBadge[]
}

export interface CommunityFeedItem extends CommunityPost {
  canFollow?: boolean
}

export interface DataService {
  // Auth
  register(payload: RegisterPayload): Promise<AuthSession>
  login(email: string, password: string): Promise<AuthSession>
  logout(): Promise<void>
  getSession(): AuthSession | null
  savePreferences(prefs: Partial<UserPreferences>): Promise<AuthSession>

  // Profile
  getProfile(): Promise<User>
  updateProfile(patch: Partial<User>): Promise<User>
  /** Photo de profil (image carrée déjà redimensionnée côté client). */
  uploadAvatar(image: Blob): Promise<User>
  removeAvatar(): Promise<User>
  getPreferences(): Promise<UserPreferences>

  // Program
  getProgram(): Promise<WorkoutProgram>
  completeWorkout(payload: CompleteWorkoutPayload): Promise<WorkoutProgram>

  // Nutrition
  getNutritionPlan(): Promise<NutritionPlan>
  getMealLogs(date: string): Promise<MealLogEntry[]>
  logMeal(entry: Omit<MealLogEntry, 'id'>): Promise<MealLogEntry>
  removeMealLog(id: string): Promise<void>
  getShoppingList(): Promise<ShoppingItem[]>
  toggleShoppingItem(id: string): Promise<ShoppingItem[]>
  regenerateShoppingList(): Promise<ShoppingItem[]>
  addShoppingItem(name: string, quantity: string): Promise<ShoppingItem[]>

  // Hydration
  getWaterLog(date: string): Promise<WaterLog>
  addWater(ml: number): Promise<WaterLog>

  // Activity / Podometer
  startActivity(payload: StartActivityPayload): Promise<Activity>
  updateActivity(id: string, patch: UpdateActivityPayload): Promise<Activity>
  finishActivity(id: string): Promise<{ activity: Activity; flagged: boolean; reason?: string }>
  /** Abandon d'une session en cours : elle est supprimée (n'apparaît ni dans l'historique ni au classement). */
  cancelActivity(id: string): Promise<void>
  getActivities(): Promise<Activity[]>
  getActiveActivity(): Promise<Activity | null>
  getSteps(date: string): Promise<number>
  setSteps(date: string, steps: number): Promise<number>

  // Leaderboard
  getLeaderboard(period: LeaderboardPeriod): Promise<Leaderboard>

  // Challenges
  getChallenges(): Promise<Challenge[]>
  getParticipations(): Promise<ChallengeParticipation[]>
  joinChallenge(id: string): Promise<ChallengeParticipation>
  /** Quitte un défi rejoint (la progression est abandonnée). */
  leaveChallenge(id: string): Promise<void>

  // Badges
  getBadges(): Promise<BadgeCollection>

  // Community
  getFeed(): Promise<CommunityFeedItem[]>
  createPost(content: string, activitySummary?: CommunityPost['activitySummary']): Promise<CommunityPost>
  toggleLike(postId: string): Promise<CommunityPost>
  addComment(postId: string, text: string): Promise<CommunityPost>

  // Lives
  getLives(): Promise<LiveSession[]>
  getLive(id: string): Promise<LiveSession>
  getLiveMessages(id: string): Promise<LiveMessage[]>
  sendLiveMessage(id: string, text: string, isQuestion?: boolean): Promise<LiveMessage>
  createLive(input: Partial<LiveSession>): Promise<LiveSession>
  setLiveStatus(id: string, status: LiveSession['status']): Promise<LiveSession>
  /** Coach / admin uniquement. */
  updateLive(id: string, patch: Partial<LiveSession>): Promise<LiveSession>
  /** Coach / admin uniquement. */
  deleteLive(id: string): Promise<void>
  /** L'hôte diffuse sa caméra depuis l'app (état caméra / micro). */
  setLiveBroadcast(id: string, state: { cameraOn: boolean; micOn: boolean }): Promise<LiveSession>
  sendLiveSignal(id: string, to: string, kind: LiveSignal['kind'], payload?: unknown): Promise<void>
  /** Signaux en attente pour l'utilisateur connecté (consommés à la lecture). */
  getLiveSignals(id: string): Promise<LiveSignal[]>
  /** Supprime définitivement le compte de l'utilisateur connecté. */
  deleteMyAccount(): Promise<void>
  /** Change le mot de passe de l'utilisateur connecté (l'actuel est exigé). */
  changePassword(currentPassword: string, newPassword: string): Promise<void>

  // Événements (création / modification : coach ou admin)
  getEvents(): Promise<FitEvent[]>
  createEvent(input: EventInput): Promise<FitEvent>
  updateEvent(id: string, patch: Partial<EventInput>): Promise<FitEvent>
  deleteEvent(id: string): Promise<void>
  toggleEventAttendance(id: string): Promise<FitEvent>

  // Annonces (création / modification : coach ou admin)
  /** includeExpired : vue gestion, inclut les annonces expirées. */
  getAnnouncements(includeExpired?: boolean): Promise<Announcement[]>
  createAnnouncement(input: AnnouncementInput): Promise<Announcement>
  updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement>
  deleteAnnouncement(id: string): Promise<void>

  // Coach IA
  getAiConversation(): Promise<ChatMessage[]>
  sendAiMessage(text: string): Promise<ChatMessage[]>

  // Subscription
  getPlans(): Promise<SubscriptionPlan[]>
  getSubscription(): Promise<Subscription | null>
  subscribe(plan: SubscriptionPlan['id'], billing: Subscription['billing']): Promise<Subscription>
  /** Résilie : l'accès Premium reste ouvert jusqu'à la fin de la période payée. */
  cancelSubscription(): Promise<Subscription | null>
  /** Réactive le renouvellement d'un abonnement résilié mais encore en cours. */
  resumeSubscription(): Promise<Subscription | null>

  // Paiements (Mobile Money / carte)
  /** Crée un paiement en attente et déclenche la demande auprès de l'opérateur. */
  startCheckout(input: CheckoutInput): Promise<Payment>
  /** Statut d'un paiement (à interroger jusqu'à succeeded / failed). */
  getPayment(id: string): Promise<Payment>
  getPayments(): Promise<Payment[]>

  // Menu du jour (écriture : coach ou admin)
  getMenu(from: string, to: string): Promise<MenuItem[]>
  createMenuItem(input: MenuItemInput): Promise<MenuItem>
  updateMenuItem(id: string, patch: Partial<MenuItemInput>): Promise<MenuItem>
  deleteMenuItem(id: string): Promise<void>

  // Notifications
  getNotifications(): Promise<Notification[]>
  markNotificationRead(id: string): Promise<Notification[]>
  markAllNotificationsRead(): Promise<Notification[]>

  // Progress
  getProgress(range: ProgressRange): Promise<ProgressSummary>
  addWeight(value: number): Promise<ProgressSummary>

  // Codes promo (création : coach ou admin ; utilisation : tout membre)
  redeemPromoCode(code: string): Promise<PromoRedemption>
  getPromoCodes(): Promise<PromoCode[]>
  createPromoCode(input: PromoCodeInput): Promise<PromoCode>
  setPromoCodeActive(code: string, active: boolean): Promise<PromoCode>
  deletePromoCode(code: string): Promise<void>

  // Messagerie avec les coachs du site
  getCoachMessages(): Promise<CoachMessage[]>
  sendCoachMessage(text: string): Promise<CoachMessage[]>
  getCoachUnread(): Promise<number>
  /** Coachs / admins : conversations de tous les membres. */
  getCoachInbox(): Promise<CoachThread[]>
  getCoachThread(memberId: string): Promise<CoachMessage[]>
  replyToMember(memberId: string, text: string): Promise<CoachMessage[]>

  // Admin
  getAdminStats(): Promise<AdminStats>
  getAdminUsers(): Promise<AdminUserRow[]>
  /** Activités de tous les membres en attente de vérification (anti-triche). */
  getPendingActivities(): Promise<Activity[]>
  reviewActivity(id: string, decision: 'validated' | 'rejected'): Promise<Activity>

  // Super admin : gestion de tous les comptes
  getAllUsers(): Promise<ManagedUser[]>
  setUserRole(id: string, role: User['role']): Promise<ManagedUser>
  /** days > 0 : offre (ou prolonge) Premium ; days = 0 : retire Premium. */
  setUserPremium(id: string, days: number): Promise<ManagedUser>
  /** Supprime le compte et toutes ses données. */
  deleteUser(id: string): Promise<void>
}

export class ApiError extends Error {
  status: number
  constructor(message: string, status = 400) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
