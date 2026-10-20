import type {
  CoachMessage,
  CoachThread,
  PromoCode,
  PromoCodeInput,
  PromoRedemption,
  Announcement,
  CheckoutInput,
  MenuItem,
  MenuItemInput,
  Payment,
  AnnouncementInput,
  EventInput,
  FitEvent,
  Activity,
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
import { API_ORIGIN } from '@/utils/apiUrl'

const TOKEN_KEY = 'fitlife:token'
const USER_KEY = 'fitlife:user'

interface FinishResponse {
  activity: Activity
  flagged: boolean
  reason?: string
}

class RestAdapter implements DataService {
  private base = `${API_ORIGIN}/api`

  private token(): string | null {
    return localStorage.getItem(TOKEN_KEY)
  }

  private async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = { 'Content-Type': 'application/json' }
    const token = this.token()
    if (token) headers.Authorization = `Bearer ${token}`
    const res = await fetch(`${this.base}${path}`, { ...options, headers: { ...headers, ...options.headers } })
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) {
      throw new ApiError(data?.message ?? 'Erreur serveur', res.status)
    }
    return data as T
  }

  private async setSession(session: AuthSession): Promise<AuthSession> {
    localStorage.setItem(TOKEN_KEY, session.token)
    localStorage.setItem(USER_KEY, JSON.stringify(session))
    return session
  }

  async register(payload: RegisterPayload): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
    return this.setSession(session)
  }

  async login(email: string, password: string): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    return this.setSession(session)
  }

  async logout(): Promise<void> {
    try {
      await this.request('/auth/logout', { method: 'POST' })
    } finally {
      localStorage.removeItem(TOKEN_KEY)
      localStorage.removeItem(USER_KEY)
    }
  }

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    const session = await this.request<AuthSession>('/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
    })
    await this.setSession(session)
  }

  async deleteMyAccount(): Promise<void> {
    await this.request('/profile', { method: 'DELETE' })
    localStorage.removeItem(TOKEN_KEY)
    localStorage.removeItem(USER_KEY)
  }

  getSession(): AuthSession | null {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? (JSON.parse(raw) as AuthSession) : null
  }

  async savePreferences(prefs: Partial<UserPreferences>): Promise<AuthSession> {
    const session = await this.request<AuthSession>('/profile/preferences', {
      method: 'PUT',
      body: JSON.stringify(prefs),
    })
    return this.setSession(session)
  }

  async getProfile(): Promise<User> {
    return this.cacheUser(await this.request<User>('/profile'))
  }
  /** Garde la session en cache à jour (sinon le profil affiché resterait celui de la connexion). */
  private cacheUser(user: User): User {
    const s = this.getSession()
    if (s) localStorage.setItem(USER_KEY, JSON.stringify({ ...s, user }))
    return user
  }

  async updateProfile(patch: Partial<User>): Promise<User> {
    return this.cacheUser(await this.request<User>('/profile', { method: 'PUT', body: JSON.stringify(patch) }))
  }
  getPreferences(): Promise<UserPreferences> {
    return this.request('/profile/preferences')
  }

  getProgram(): Promise<WorkoutProgram> {
    return this.request('/program')
  }
  completeWorkout(payload: CompleteWorkoutPayload): Promise<WorkoutProgram> {
    return this.request('/workouts/complete', { method: 'POST', body: JSON.stringify(payload) })
  }

  getNutritionPlan(): Promise<NutritionPlan> {
    return this.request('/nutrition')
  }
  getMealLogs(date: string): Promise<MealLogEntry[]> {
    return this.request(`/meals?date=${date}`)
  }
  logMeal(entry: Omit<MealLogEntry, 'id'>): Promise<MealLogEntry> {
    return this.request('/meals', { method: 'POST', body: JSON.stringify(entry) })
  }
  removeMealLog(id: string): Promise<void> {
    return this.request(`/meals/${id}`, { method: 'DELETE' })
  }
  getShoppingList(): Promise<ShoppingItem[]> {
    return this.request('/shopping-list')
  }
  toggleShoppingItem(id: string): Promise<ShoppingItem[]> {
    return this.request(`/shopping-list/${id}`, { method: 'PATCH' })
  }
  regenerateShoppingList(): Promise<ShoppingItem[]> {
    return this.request('/shopping-list/regenerate', { method: 'POST' })
  }
  addShoppingItem(name: string, quantity: string): Promise<ShoppingItem[]> {
    return this.request('/shopping-list', { method: 'POST', body: JSON.stringify({ name, quantity }) })
  }

  getWaterLog(date: string): Promise<WaterLog> {
    return this.request(`/water?date=${date}`)
  }
  addWater(ml: number): Promise<WaterLog> {
    return this.request('/water', { method: 'POST', body: JSON.stringify({ ml }) })
  }

  startActivity(payload: StartActivityPayload): Promise<Activity> {
    return this.request('/activity/start', { method: 'POST', body: JSON.stringify(payload) })
  }
  updateActivity(id: string, patch: UpdateActivityPayload): Promise<Activity> {
    return this.request(`/activity/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }
  finishActivity(id: string): Promise<FinishResponse> {
    return this.request(`/activity/${id}/finish`, { method: 'POST' })
  }
  cancelActivity(id: string): Promise<void> {
    return this.request(`/activity/${id}`, { method: 'DELETE' })
  }
  getActivities(): Promise<Activity[]> {
    return this.request('/activity')
  }
  getActiveActivity(): Promise<Activity | null> {
    return this.request('/activity/active')
  }
  getSteps(date: string): Promise<number> {
    return this.request(`/steps?date=${date}`)
  }
  setSteps(date: string, steps: number): Promise<number> {
    return this.request('/steps', { method: 'POST', body: JSON.stringify({ date, steps }) })
  }

  getLeaderboard(period: LeaderboardPeriod): Promise<Leaderboard> {
    return this.request(`/leaderboard/${period}`)
  }

  getChallenges(): Promise<Challenge[]> {
    return this.request('/challenges')
  }
  getParticipations(): Promise<ChallengeParticipation[]> {
    return this.request('/challenges/participations')
  }
  async leaveChallenge(id: string): Promise<void> {
    await this.request(`/challenges/${id}/join`, { method: 'DELETE' })
  }
  joinChallenge(id: string): Promise<ChallengeParticipation> {
    return this.request(`/challenges/${id}/join`, { method: 'POST' })
  }

  async getBadges(): Promise<BadgeCollection> {
    const [all, earned] = await Promise.all([
      this.request<Badge[]>('/badges'),
      this.request<UserBadge[]>('/badges/earned'),
    ])
    return { all, earned }
  }

  getFeed(): Promise<CommunityFeedItem[]> {
    return this.request('/community/posts')
  }
  createPost(content: string, activitySummary?: CommunityPost['activitySummary']): Promise<CommunityPost> {
    return this.request('/community/posts', {
      method: 'POST',
      body: JSON.stringify({ content, activitySummary }),
    })
  }
  toggleLike(postId: string): Promise<CommunityPost> {
    return this.request(`/community/posts/${postId}/like`, { method: 'POST' })
  }
  addComment(postId: string, text: string): Promise<CommunityPost> {
    return this.request(`/community/posts/${postId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ text }),
    })
  }

  getLives(): Promise<LiveSession[]> {
    return this.request('/lives')
  }
  getLive(id: string): Promise<LiveSession> {
    return this.request(`/lives/${id}`)
  }
  getLiveMessages(id: string): Promise<LiveMessage[]> {
    return this.request(`/lives/${id}/messages`)
  }
  sendLiveMessage(id: string, text: string, isQuestion?: boolean): Promise<LiveMessage> {
    return this.request(`/lives/${id}/messages`, {
      method: 'POST',
      body: JSON.stringify({ text, isQuestion }),
    })
  }
  createLive(input: Partial<LiveSession>): Promise<LiveSession> {
    return this.request('/lives', { method: 'POST', body: JSON.stringify(input) })
  }
  setLiveStatus(id: string, status: LiveSession['status']): Promise<LiveSession> {
    return this.request(`/lives/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
  }
  updateLive(id: string, patch: Partial<LiveSession>): Promise<LiveSession> {
    return this.request(`/lives/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }
  deleteLive(id: string): Promise<void> {
    return this.request(`/lives/${id}`, { method: 'DELETE' })
  }
  setLiveBroadcast(id: string, state: { cameraOn: boolean; micOn: boolean }): Promise<LiveSession> {
    return this.request(`/lives/${id}/broadcast`, { method: 'PUT', body: JSON.stringify(state) })
  }
  async sendLiveSignal(id: string, to: string, kind: LiveSignal['kind'], payload?: unknown): Promise<void> {
    await this.request(`/lives/${id}/signals`, { method: 'POST', body: JSON.stringify({ to, kind, payload }) })
  }
  getLiveSignals(id: string): Promise<LiveSignal[]> {
    return this.request(`/lives/${id}/signals`)
  }

  getEvents(): Promise<FitEvent[]> {
    return this.request('/events')
  }
  createEvent(input: EventInput): Promise<FitEvent> {
    return this.request('/events', { method: 'POST', body: JSON.stringify(input) })
  }
  updateEvent(id: string, patch: Partial<EventInput>): Promise<FitEvent> {
    return this.request(`/events/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }
  deleteEvent(id: string): Promise<void> {
    return this.request(`/events/${id}`, { method: 'DELETE' })
  }
  toggleEventAttendance(id: string): Promise<FitEvent> {
    return this.request(`/events/${id}/attend`, { method: 'POST' })
  }

  getAnnouncements(includeExpired = false): Promise<Announcement[]> {
    return this.request(`/announcements${includeExpired ? '?all=1' : ''}`)
  }
  createAnnouncement(input: AnnouncementInput): Promise<Announcement> {
    return this.request('/announcements', { method: 'POST', body: JSON.stringify(input) })
  }
  updateAnnouncement(id: string, patch: Partial<AnnouncementInput>): Promise<Announcement> {
    return this.request(`/announcements/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }
  deleteAnnouncement(id: string): Promise<void> {
    return this.request(`/announcements/${id}`, { method: 'DELETE' })
  }

  async uploadAvatar(image: Blob): Promise<User> {
    const form = new FormData()
    form.append('avatar', image, 'avatar.jpg')
    const token = this.token()
    const res = await fetch(`${this.base}/profile/avatar`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: form,
    })
    const text = await res.text()
    const data = text ? JSON.parse(text) : null
    if (!res.ok) throw new ApiError(data?.message ?? 'Envoi de la photo impossible', res.status)
    return this.cacheUser(data as User)
  }
  async removeAvatar(): Promise<User> {
    return this.cacheUser(await this.request<User>('/profile/avatar', { method: 'DELETE' }))
  }

  getAiConversation(): Promise<ChatMessage[]> {
    return this.request('/ai/conversation')
  }
  sendAiMessage(text: string): Promise<ChatMessage[]> {
    return this.request('/ai/messages', { method: 'POST', body: JSON.stringify({ text }) })
  }

  getPlans(): Promise<SubscriptionPlan[]> {
    return this.request('/subscription/plans')
  }
  getSubscription(): Promise<Subscription | null> {
    return this.request('/subscription')
  }
  subscribe(plan: SubscriptionPlan['id'], billing: Subscription['billing']): Promise<Subscription> {
    return this.request('/subscription', { method: 'POST', body: JSON.stringify({ plan, billing }) })
  }
  cancelSubscription(): Promise<Subscription | null> {
    return this.request('/subscription', { method: 'DELETE' })
  }
  resumeSubscription(): Promise<Subscription | null> {
    return this.request('/subscription/resume', { method: 'POST' })
  }

  startCheckout(input: CheckoutInput): Promise<Payment> {
    return this.request('/payments', { method: 'POST', body: JSON.stringify(input) })
  }
  getPayment(id: string): Promise<Payment> {
    return this.request(`/payments/${id}`)
  }
  getPayments(): Promise<Payment[]> {
    return this.request('/payments')
  }

  getMenu(from: string, to: string): Promise<MenuItem[]> {
    return this.request(`/menu?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`)
  }
  createMenuItem(input: MenuItemInput): Promise<MenuItem> {
    return this.request('/menu', { method: 'POST', body: JSON.stringify(input) })
  }
  updateMenuItem(id: string, patch: Partial<MenuItemInput>): Promise<MenuItem> {
    return this.request(`/menu/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
  }
  deleteMenuItem(id: string): Promise<void> {
    return this.request(`/menu/${id}`, { method: 'DELETE' })
  }

  getNotifications(): Promise<Notification[]> {
    return this.request('/notifications')
  }
  markNotificationRead(id: ID): Promise<Notification[]> {
    return this.request(`/notifications/${id}/read`, { method: 'PATCH' })
  }
  markAllNotificationsRead(): Promise<Notification[]> {
    return this.request('/notifications/read-all', { method: 'PATCH' })
  }

  getProgress(range: ProgressRange): Promise<ProgressSummary> {
    return this.request(`/progress?range=${range}`)
  }
  addWeight(value: number): Promise<ProgressSummary> {
    return this.request('/progress/weight', { method: 'POST', body: JSON.stringify({ value }) })
  }

  redeemPromoCode(code: string): Promise<PromoRedemption> {
    return this.request('/promo/redeem', { method: 'POST', body: JSON.stringify({ code }) })
  }
  getPromoCodes(): Promise<PromoCode[]> {
    return this.request('/promo-codes')
  }
  createPromoCode(input: PromoCodeInput): Promise<PromoCode> {
    return this.request('/promo-codes', { method: 'POST', body: JSON.stringify(input) })
  }
  setPromoCodeActive(code: string, active: boolean): Promise<PromoCode> {
    return this.request(`/promo-codes/${encodeURIComponent(code)}`, { method: 'PATCH', body: JSON.stringify({ active }) })
  }
  async deletePromoCode(code: string): Promise<void> {
    await this.request(`/promo-codes/${encodeURIComponent(code)}`, { method: 'DELETE' })
  }

  getCoachMessages(): Promise<CoachMessage[]> {
    return this.request('/coach/messages')
  }
  sendCoachMessage(text: string): Promise<CoachMessage[]> {
    return this.request('/coach/messages', { method: 'POST', body: JSON.stringify({ text }) })
  }
  async getCoachUnread(): Promise<number> {
    return (await this.request<{ unread: number }>('/coach/unread')).unread
  }
  getCoachInbox(): Promise<CoachThread[]> {
    return this.request('/coach/inbox')
  }
  getCoachThread(memberId: string): Promise<CoachMessage[]> {
    return this.request(`/coach/inbox/${encodeURIComponent(memberId)}`)
  }
  replyToMember(memberId: string, text: string): Promise<CoachMessage[]> {
    return this.request(`/coach/inbox/${encodeURIComponent(memberId)}`, { method: 'POST', body: JSON.stringify({ text }) })
  }

  getAdminStats(): Promise<AdminStats> {
    return this.request('/admin/stats')
  }
  getAdminUsers(): Promise<AdminUserRow[]> {
    return this.request('/admin/users')
  }
  getAllUsers(): Promise<ManagedUser[]> {
    return this.request('/superadmin/users')
  }
  setUserRole(id: string, role: User['role']): Promise<ManagedUser> {
    return this.request(`/superadmin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) })
  }
  setUserPremium(id: string, days: number): Promise<ManagedUser> {
    return this.request(`/superadmin/users/${id}/premium`, { method: 'PATCH', body: JSON.stringify({ days }) })
  }
  deleteUser(id: string): Promise<void> {
    return this.request(`/superadmin/users/${id}`, { method: 'DELETE' })
  }

  getPendingActivities(): Promise<Activity[]> {
    return this.request('/admin/activities/pending')
  }
  reviewActivity(id: string, decision: 'validated' | 'rejected'): Promise<Activity> {
    return this.request(`/admin/activities/${id}/review`, {
      method: 'PATCH',
      body: JSON.stringify({ decision }),
    })
  }
}

export const restAdapter = new RestAdapter()
