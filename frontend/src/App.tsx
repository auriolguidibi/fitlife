import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { lazy, Suspense } from 'react'
import type { ReactNode } from 'react'
import { useAuth } from '@/context/AuthContext'
import { Spinner } from '@/components/ui'
import { AppLayout } from '@/components/layout/AppLayout'
import { AuthLayout } from '@/components/layout/AuthLayout'

import { LoginPage } from '@/pages/auth/LoginPage'
import { RegisterPage } from '@/pages/auth/RegisterPage'
import { ForgotPasswordPage } from '@/pages/auth/ForgotPasswordPage'
const OnboardingPage = lazy(() => import('@/pages/onboarding/OnboardingPage').then((m) => ({ default: m.OnboardingPage })))
import { HomePage } from '@/pages/home/HomePage'
const ProgramPage = lazy(() => import('@/pages/program/ProgramPage').then((m) => ({ default: m.ProgramPage })))
const WorkoutSessionPage = lazy(() => import('@/pages/workout/WorkoutSessionPage').then((m) => ({ default: m.WorkoutSessionPage })))
const NutritionPage = lazy(() => import('@/pages/nutrition/NutritionPage').then((m) => ({ default: m.NutritionPage })))
const ShoppingListPage = lazy(() => import('@/pages/nutrition/ShoppingListPage').then((m) => ({ default: m.ShoppingListPage })))
const HydrationPage = lazy(() => import('@/pages/nutrition/HydrationPage').then((m) => ({ default: m.HydrationPage })))
const ActivityPage = lazy(() => import('@/pages/activity/ActivityPage').then((m) => ({ default: m.ActivityPage })))
const LeaderboardPage = lazy(() => import('@/pages/leaderboard/LeaderboardPage').then((m) => ({ default: m.LeaderboardPage })))
const ChallengesPage = lazy(() => import('@/pages/challenges/ChallengesPage').then((m) => ({ default: m.ChallengesPage })))
const BadgesPage = lazy(() => import('@/pages/badges/BadgesPage').then((m) => ({ default: m.BadgesPage })))
const LivesPage = lazy(() => import('@/pages/lives/LivesPage').then((m) => ({ default: m.LivesPage })))
const LiveRoomPage = lazy(() => import('@/pages/lives/LiveRoomPage').then((m) => ({ default: m.LiveRoomPage })))
const CommunityPage = lazy(() => import('@/pages/community/CommunityPage').then((m) => ({ default: m.CommunityPage })))
const CoachChatPage = lazy(() => import('@/pages/coach/CoachChatPage').then((m) => ({ default: m.CoachChatPage })))
const ProgressPage = lazy(() => import('@/pages/progress/ProgressPage').then((m) => ({ default: m.ProgressPage })))
const ProfilePage = lazy(() => import('@/pages/profile/ProfilePage').then((m) => ({ default: m.ProfilePage })))
const PremiumPage = lazy(() => import('@/pages/premium/PremiumPage').then((m) => ({ default: m.PremiumPage })))
const NotificationsPage = lazy(() => import('@/pages/notifications/NotificationsPage').then((m) => ({ default: m.NotificationsPage })))
const AdminPage = lazy(() => import('@/pages/admin/AdminPage').then((m) => ({ default: m.AdminPage })))
const ManagementPage = lazy(() => import('@/pages/management/ManagementPage').then((m) => ({ default: m.ManagementPage })))
const SuperAdminPage = lazy(() => import('@/pages/superadmin/SuperAdminPage').then((m) => ({ default: m.SuperAdminPage })))
const VideosPage = lazy(() => import('@/pages/videos/VideosPage').then((m) => ({ default: m.VideosPage })))
const EventsPage = lazy(() => import('@/pages/events/EventsPage').then((m) => ({ default: m.EventsPage })))
const HelpPage = lazy(() => import('@/pages/help/HelpPage').then((m) => ({ default: m.HelpPage })))
import { NotFoundPage } from '@/pages/NotFoundPage'
import { PremiumGate } from '@/components/domain/PremiumGate'
import { isAdmin, isStaff, isSuperAdmin } from '@/utils/roles'

function FullScreenLoader() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900">
      <Spinner label="Chargement de FitLife…" />
    </div>
  )
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, needsOnboarding } = useAuth()
  const location = useLocation()
  if (loading) return <FullScreenLoader />
  if (!isAuthenticated) return <Navigate to="/login" state={{ from: location.pathname }} replace />
  if (needsOnboarding && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />
  }
  return <>{children}</>
}

function RequireRole({ children, role }: { children: ReactNode; role: 'superadmin' | 'admin' | 'coach' }) {
  const { user } = useAuth()
  if (role === 'superadmin' && !isSuperAdmin(user)) return <Navigate to="/" replace />
  if (role === 'admin' && !isAdmin(user)) return <Navigate to="/" replace />
  if (role === 'coach' && !isStaff(user)) return <Navigate to="/" replace />
  return <>{children}</>
}

function PublicOnly({ children }: { children: ReactNode }) {
  const { isAuthenticated, loading, needsOnboarding } = useAuth()
  if (loading) return <FullScreenLoader />
  if (isAuthenticated) return <Navigate to={needsOnboarding ? '/onboarding' : '/'} replace />
  return <>{children}</>
}

export default function App() {
  return (
    <Suspense fallback={<FullScreenLoader />}>
    <Routes>
      <Route
        element={
          <PublicOnly>
            <AuthLayout />
          </PublicOnly>
        }
      >
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      </Route>

      <Route
        path="/onboarding"
        element={
          <RequireAuth>
            <OnboardingPage />
          </RequireAuth>
        }
      />

      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<HomePage />} />
        <Route path="/program" element={<PremiumGate><ProgramPage /></PremiumGate>} />
        <Route path="/workout/:workoutId" element={<WorkoutSessionPage />} />
        <Route path="/nutrition" element={<NutritionPage />} />
        <Route path="/nutrition/shopping" element={<PremiumGate><ShoppingListPage /></PremiumGate>} />
        <Route path="/hydration" element={<HydrationPage />} />
        <Route path="/activity" element={<ActivityPage />} />
        <Route path="/leaderboard" element={<PremiumGate><LeaderboardPage /></PremiumGate>} />
        <Route path="/challenges" element={<PremiumGate><ChallengesPage /></PremiumGate>} />
        <Route path="/badges" element={<PremiumGate><BadgesPage /></PremiumGate>} />
        <Route path="/lives" element={<LivesPage />} />
        <Route path="/lives/:id" element={<LiveRoomPage />} />
        <Route path="/events" element={<EventsPage />} />
        <Route path="/videos" element={<VideosPage />} />
        <Route path="/community" element={<CommunityPage />} />
        <Route path="/coach" element={<CoachChatPage />} />
        <Route path="/progress" element={<ProgressPage />} />
        <Route path="/profile" element={<ProfilePage />} />
        <Route path="/premium" element={<PremiumPage />} />
        <Route path="/abonnement" element={<Navigate to="/premium" replace />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/help" element={<HelpPage />} />
        <Route
          path="/admin"
          element={
            <RequireRole role="admin">
              <AdminPage />
            </RequireRole>
          }
        />
        <Route
          path="/gestion"
          element={
            <RequireRole role="coach">
              <ManagementPage />
            </RequireRole>
          }
        />
        <Route path="/coach-space" element={<Navigate to="/gestion" replace />} />
        <Route
          path="/super-admin"
          element={
            <RequireRole role="superadmin">
              <SuperAdminPage />
            </RequireRole>
          }
        />
      </Route>

      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}
