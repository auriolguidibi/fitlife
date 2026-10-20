import type { PaymentMethod, SubscriptionPlan } from '@/types'

/** Offre payante unique (cf. « Comparatif détaillé — Offre Gratuit vs Premium »). */
export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'premium',
    name: 'Premium',
    priceMonthly: 4000,
    priceYearly: 40000,
    currency: 'FCFA',
    highlighted: true,
    features: [
      'Programme personnalisé selon ton objectif, ton niveau et ta disponibilité',
      'Bibliothèque complète d’exercices et de vidéos',
      'Lives Premium et questions aux coachs pendant les lives',
      'Programme alimentaire, menus de la semaine et liste de courses',
      'Messagerie avec un vrai coach FitLife',
      'Défis, classements, badges et récompenses',
      'Historique complet, statistiques et graphiques',
    ],
  },
]

export const planById = (id: SubscriptionPlan['id']) =>
  subscriptionPlans.find((p) => p.id === id) ?? subscriptionPlans[0]

export type Access = 'yes' | 'limited' | 'no'

/** Lignes du comparatif Gratuit / Premium (document d'offre FitLife). */
export const offerComparison: { feature: string; free: string; freeAccess: Access; premium: string }[] = [
  { feature: 'Exercices', free: 'Quelques exercices de base', freeAccess: 'limited', premium: 'Accès complet à la bibliothèque' },
  { feature: 'Vidéos d’entraînement', free: 'Quelques vidéos sélectionnées', freeAccess: 'limited', premium: 'Catalogue complet + nouvelles vidéos' },
  { feature: 'Programmes personnalisés', free: 'Non disponible', freeAccess: 'no', premium: 'Programme selon objectif, niveau et disponibilité' },
  { feature: 'Lives fitness', free: 'Lives gratuits / accès limité', freeAccess: 'limited', premium: 'Accès aux lives Premium' },
  { feature: 'Messagerie avec le coach', free: 'Questions au coach', freeAccess: 'yes', premium: 'Questions au coach + échanges pendant les lives' },
  { feature: 'Suivi des séances', free: 'Suivi simple des séances', freeAccess: 'limited', premium: 'Historique + statistiques détaillées' },
  { feature: 'Suivi de progression', free: 'Données principales uniquement', freeAccess: 'limited', premium: 'Progression complète avec graphiques' },
  { feature: 'Poids & mensurations', free: 'Saisie et consultation limitée', freeAccess: 'limited', premium: 'Historique + évolution dans le temps' },
  { feature: 'Défis communautaires', free: 'Pas d’accès aux défis Premium', freeAccess: 'no', premium: 'Participation aux défis + progression' },
  { feature: 'Classements & badges', free: 'Non disponible', freeAccess: 'no', premium: 'Classements + badges + récompenses' },
  { feature: 'Suivi de l’alimentation', free: 'Suivi basique des repas', freeAccess: 'limited', premium: 'Suivi complet des repas et objectifs' },
  { feature: 'Programme alimentaire', free: 'Non disponible', freeAccess: 'no', premium: 'Programme adapté à l’objectif' },
  { feature: 'Menu hebdomadaire', free: 'Non disponible', freeAccess: 'no', premium: 'Menus personnalisés pour la semaine' },
  { feature: 'Suivi des repas', free: 'Enregistrement simple', freeAccess: 'limited', premium: 'Repas + horaires + apports nutritionnels' },
  { feature: 'Hydratation', free: 'Suivi manuel limité', freeAccess: 'limited', premium: 'Objectif quotidien + historique' },
  { feature: 'Apports nutritionnels', free: 'Non disponible', freeAccess: 'no', premium: 'Estimation calories, protéines, glucides, lipides' },
  { feature: 'Liste de courses', free: 'Non disponible', freeAccess: 'no', premium: 'Générée automatiquement depuis les menus' },
  { feature: 'Suggestions de repas', free: 'Quelques suggestions générales', freeAccess: 'limited', premium: 'Suggestions adaptées à l’objectif et aux préférences' },
  { feature: 'Podomètre & activités', free: 'Pas et activité de base', freeAccess: 'yes', premium: 'Pas + GPS + distance + classement' },
  { feature: 'Classement kilométrique', free: 'Non disponible', freeAccess: 'no', premium: 'Classement quotidien, hebdomadaire et mensuel' },
  { feature: 'Historique complet', free: 'Historique limité', freeAccess: 'limited', premium: 'Historique complet des activités et repas' },
  { feature: 'Statistiques détaillées', free: 'Statistiques essentielles', freeAccess: 'limited', premium: 'Tableaux, graphiques et tendances' },
]

/** Moyens de paiement proposés. */
export const paymentMethods: {
  id: PaymentMethod
  label: string
  short: string
  kind: 'mobile' | 'card'
  /** Couleur de marque (pastille). */
  color: string
  hint: string
}[] = [
  { id: 'orange_money', label: 'Orange Money', short: 'OM', kind: 'mobile', color: '#FF7900', hint: 'Valide avec ton code secret Orange Money.' },
  { id: 'mtn_momo', label: 'MTN Mobile Money', short: 'MoMo', kind: 'mobile', color: '#FFCC00', hint: 'Valide la demande reçue sur ton téléphone MTN.' },
  { id: 'moov_money', label: 'Moov Money', short: 'Moov', kind: 'mobile', color: '#0066B3', hint: 'Valide avec ton code Moov Money.' },
  { id: 'wave', label: 'Wave', short: 'Wave', kind: 'mobile', color: '#1DC8F2', hint: 'Confirme le paiement dans ton application Wave.' },
  { id: 'card', label: 'Carte bancaire', short: 'Carte', kind: 'card', color: '#1F2937', hint: 'Visa ou Mastercard, sur la page sécurisée du prestataire.' },
]

export const paymentMethodById = (id: PaymentMethod) => paymentMethods.find((m) => m.id === id) ?? paymentMethods[0]

/** Fonctionnalités réservées au Premium (accès « Non disponible » en gratuit). */
export const premiumRoutes: Record<string, string> = {
  '/program': 'Programmes personnalisés',
  '/nutrition/shopping': 'Liste de courses',
  '/leaderboard': 'Classement kilométrique',
  '/challenges': 'Défis communautaires',
  '/badges': 'Classements & badges',
}
