import {
  Activity,
  Apple,
  Award,
  MessageCircle,
  CalendarDays,
  Clapperboard,
  Crown,
  Dumbbell,
  Home,
  MapPin,
  Radio,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

export interface NavItem {
  to: string
  label: string
  icon: LucideIcon
  primary?: boolean
  end?: boolean
  premium?: boolean
}

export const primaryNav: NavItem[] = [
  { to: '/', label: 'Accueil', icon: Home, end: true },
  { to: '/program', label: 'Programme', icon: Dumbbell },
  { to: '/progress', label: 'Suivi', icon: TrendingUp },
  { to: '/community', label: 'Communauté', icon: Users },
  { to: '/profile', label: 'Profil', icon: User },
]

export const sidebarSections: { title: string; items: NavItem[] }[] = [
  {
    title: 'Entraînement',
    items: [
      { to: '/', label: 'Accueil', icon: Home, end: true },
      { to: '/program', label: 'Programme', icon: Dumbbell },
      { to: '/activity', label: 'Podomètre & GPS', icon: MapPin },
      { to: '/videos', label: 'Vidéos', icon: Clapperboard },
      { to: '/lives', label: 'Lives', icon: Radio },
    ],
  },
  {
    title: 'Nutrition',
    items: [
      { to: '/nutrition', label: 'Alimentation', icon: Apple },
      { to: '/nutrition/shopping', label: 'Liste de courses', icon: Target },
    ],
  },
  {
    title: 'Communauté',
    items: [
      { to: '/community', label: 'Fil communautaire', icon: Users },
      { to: '/events', label: 'Événements', icon: CalendarDays },
      { to: '/challenges', label: 'Défis', icon: Target },
      { to: '/leaderboard', label: 'Classement', icon: Trophy },
      { to: '/badges', label: 'Badges', icon: Award },
    ],
  },
  {
    title: 'Mon espace',
    items: [
      { to: '/coach', label: 'Mon coach', icon: MessageCircle },
      { to: '/progress', label: 'Progression', icon: TrendingUp },
      { to: '/activity', label: 'Activités', icon: Activity },
      { to: '/premium', label: 'Mon abonnement', icon: Crown },
      { to: '/profile', label: 'Profil', icon: User },
    ],
  },
]

export const titles: Record<string, string> = Object.fromEntries(
  sidebarSections.flatMap((s) => s.items.map((i) => [i.to, i.label])),
)
