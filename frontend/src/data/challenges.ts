import type { Challenge } from '@/types'

function iso(daysFromNow: number): string {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString()
}

export const challengeCatalog: Challenge[] = [
  {
    id: 'ch_5km',
    title: 'Défi 5 km',
    description: 'Parcours 5 km en une semaine.',
    metric: 'distance',
    target: 5,
    unit: 'km',
    days: 7,
    participants: 0,
    startsAt: iso(-2),
    endsAt: iso(5),
    badgeId: 'b_5km',
  },
  {
    id: 'ch_10000_steps',
    title: 'Défi 10 000 pas',
    description: 'Fais 10 000 pas en une journée.',
    metric: 'steps',
    target: 10000,
    unit: 'pas',
    days: 1,
    participants: 0,
    startsAt: iso(0),
    endsAt: iso(1),
    badgeId: 'b_first_step',
  },
  {
    id: 'ch_100km',
    title: 'Défi 100 km',
    description: 'Parcours 100 km dans le mois.',
    metric: 'distance',
    target: 100,
    unit: 'km',
    days: 30,
    participants: 0,
    startsAt: iso(-10),
    endsAt: iso(20),
    badgeId: 'b_100km',
  },
  {
    id: 'ch_30_days',
    title: 'Défi 30 jours',
    description: 'Bouge chaque jour pendant 30 jours.',
    metric: 'days',
    target: 30,
    unit: 'jours',
    days: 30,
    participants: 0,
    startsAt: iso(-5),
    endsAt: iso(25),
    badgeId: 'b_30_days',
  },
  {
    id: 'ch_20_sessions',
    title: 'Défi 20 séances',
    description: 'Complète 20 séances d’entraînement.',
    metric: 'sessions',
    target: 20,
    unit: 'séances',
    days: 30,
    participants: 0,
    startsAt: iso(-8),
    endsAt: iso(22),
    badgeId: 'b_20_sessions',
  },
]
