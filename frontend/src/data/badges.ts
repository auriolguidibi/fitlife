import type { Badge } from '@/types'

export const badgeCatalog: Badge[] = [
  {
    id: 'b_first_step',
    name: 'Premier pas',
    description: 'Parcours ton premier kilomètre.',
    requirement: '1 km',
    tier: 'bronze',
  },
  {
    id: 'b_5km',
    name: 'Lance-toi',
    description: 'Atteins 5 km cumulés.',
    requirement: '5 km',
    tier: 'bronze',
  },
  {
    id: 'b_25km',
    name: 'Marcheur régulier',
    description: 'Atteins 25 km cumulés.',
    requirement: '25 km',
    tier: 'silver',
  },
  {
    id: 'b_10km_5d',
    name: 'Machine',
    description: '10 km pendant 5 jours consécutifs.',
    requirement: '10 km x 5 jours',
    tier: 'gold',
  },
  {
    id: 'b_champion',
    name: 'Champion du mois',
    description: 'Termine 1er du classement mensuel.',
    requirement: 'Top 1 mensuel',
    tier: 'platinum',
  },
  {
    id: 'b_100km',
    name: 'Objectif 100 km',
    description: 'Parcours 100 km dans le mois.',
    requirement: '100 km / mois',
    tier: 'platinum',
  },
  {
    id: 'b_20_sessions',
    name: 'Assidu',
    description: 'Complète 20 séances d’entraînement.',
    requirement: '20 séances',
    tier: 'silver',
  },
  {
    id: 'b_30_days',
    name: '30 jours de feu',
    description: 'Termine le défi 30 jours.',
    requirement: 'Défi 30 jours',
    tier: 'gold',
  },
]

export const badgeById = (id: string) => badgeCatalog.find((b) => b.id === id)
