import type { LucideIcon, LucideProps } from 'lucide-react'
import {
  Activity,
  Award,
  Bike,
  BicepsFlexed,
  CalendarCheck,
  Coffee,
  Dumbbell,
  Flame,
  Footprints,
  Gem,
  HeartPulse,
  Leaf,
  Medal,
  PersonStanding,
  Soup,
  Star,
  Target,
  Trophy,
  UtensilsCrossed,
  Apple,
  Zap,
  Bell,
  CalendarDays,
  Droplets,
  Megaphone,
  Radio,
  ThumbsUp,
} from 'lucide-react'
import type { ActivityType, GoalType, Meal, Notification, Workout } from '@/types'
import { cn } from '@/utils/cn'

/**
 * Pictogrammes de l'app : chaque type métier (objectif, séance, activité,
 * badge, défi, repas) a sa vraie icône vectorielle, à la place des emojis.
 */

export const goalIcons: Record<GoalType, LucideIcon> = {
  weight_loss: Flame,
  muscle_gain: Dumbbell,
  endurance: Footprints,
  fitness: Zap,
  wellness: Leaf,
}

export const workoutTypeIcons: Record<Workout['type'], LucideIcon> = {
  full_body: Dumbbell,
  cardio: HeartPulse,
  legs: Footprints,
  abs: Target,
  upper_body: BicepsFlexed,
  mobility: PersonStanding,
}

export const activityTypeIcons: Record<ActivityType, LucideIcon> = {
  walk: Footprints,
  run: Activity,
  bike: Bike,
  other: Star,
}

export const mealTypeIcons: Record<Meal['type'], LucideIcon> = {
  breakfast: Coffee,
  lunch: UtensilsCrossed,
  snack: Apple,
  dinner: Soup,
}

export const notificationIcons: Record<Notification['type'], { icon: LucideIcon; tone: string }> = {
  workout: { icon: Dumbbell, tone: 'bg-fit/15 text-fit' },
  hydration: { icon: Droplets, tone: 'bg-sky-400/15 text-sky-300' },
  meal: { icon: UtensilsCrossed, tone: 'bg-amber-400/15 text-amber-300' },
  live: { icon: Radio, tone: 'bg-red-500/15 text-red-300' },
  leaderboard: { icon: Trophy, tone: 'bg-amber-400/15 text-amber-300' },
  badge: { icon: Award, tone: 'bg-fit/15 text-fit' },
  challenge: { icon: Target, tone: 'bg-fit/15 text-fit' },
  encouragement: { icon: ThumbsUp, tone: 'bg-fit/15 text-fit' },
  announcement: { icon: Megaphone, tone: 'bg-violet-400/15 text-violet-300' },
  event: { icon: CalendarDays, tone: 'bg-sky-400/15 text-sky-300' },
}

export const fallbackNotificationIcon = { icon: Bell, tone: 'bg-white/10 text-white/70' }

const badgeIcons: Record<string, LucideIcon> = {
  b_first_step: Footprints,
  b_5km: Activity,
  b_25km: Footprints,
  b_10km_5d: Zap,
  b_champion: Trophy,
  b_100km: Gem,
  b_20_sessions: Dumbbell,
  b_30_days: Flame,
}

const challengeIcons: Record<string, LucideIcon> = {
  ch_5km: Activity,
  ch_10000_steps: Footprints,
  ch_100km: Gem,
  ch_30_days: CalendarCheck,
  ch_20_sessions: Dumbbell,
}

export const badgeIcon = (id: string): LucideIcon => badgeIcons[id] ?? Award
export const challengeIcon = (id: string): LucideIcon => challengeIcons[id] ?? Target

/** Rend une icône issue d'une des tables ci-dessus. */
export function TypeIcon({ icon: Icon, ...props }: { icon: LucideIcon } & LucideProps) {
  return <Icon {...props} />
}

const medalStyles = [
  'bg-gradient-to-b from-amber-200 to-amber-500 text-amber-950 shadow-[0_0_12px_rgba(251,191,36,0.5)]',
  'bg-gradient-to-b from-slate-100 to-slate-400 text-slate-800',
  'bg-gradient-to-b from-orange-300 to-orange-600 text-orange-950',
]

/** Médaille or / argent / bronze pour les 3 premières places. */
export function RankMedal({ rank, size = 'md', className }: { rank: number; size?: 'sm' | 'md'; className?: string }) {
  if (rank < 1 || rank > 3) return null
  return (
    <span
      className={cn(
        'grid place-items-center rounded-full',
        size === 'sm' ? 'h-6 w-6' : 'h-8 w-8',
        medalStyles[rank - 1],
        className,
      )}
      aria-label={`Rang ${rank}`}
    >
      <Medal size={size === 'sm' ? 13 : 16} strokeWidth={2.4} />
    </span>
  )
}
