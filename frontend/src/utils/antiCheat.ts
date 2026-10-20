import type { Activity, ReviewStatus } from '@/types'
import { round } from './id'

export const ANTI_CHEAT_RULES = {
  maxRunSpeedKmh: 32,
  maxBikeSpeedKmh: 65,
  maxWalkSpeedKmh: 12,
  maxOtherSpeedKmh: 40,
  maxDistanceJumpKm: 0.6,
  minSessionSecondsForRanking: 60,
}

export interface ReviewResult {
  status: ReviewStatus
  reason?: string
}

export function reviewActivity(activity: Activity): ReviewResult {
  const { type, distanceKm, movingSeconds, durationSeconds, maxSpeedKmh, route } = activity

  const speedLimits: Record<Activity['type'], number> = {
    run: ANTI_CHEAT_RULES.maxRunSpeedKmh,
    bike: ANTI_CHEAT_RULES.maxBikeSpeedKmh,
    walk: ANTI_CHEAT_RULES.maxWalkSpeedKmh,
    other: ANTI_CHEAT_RULES.maxOtherSpeedKmh,
  }

  if (maxSpeedKmh > speedLimits[type]) {
    return {
      status: 'pending',
      reason: `Vitesse maximale inhabituelle (${round(maxSpeedKmh)} km/h).`,
    }
  }

  const avgSpeed =
    movingSeconds > 0 ? (distanceKm / (movingSeconds / 3600)) : 0
  if (avgSpeed > speedLimits[type]) {
    return {
      status: 'pending',
      reason: `Vitesse moyenne incohérente (${round(avgSpeed)} km/h).`,
    }
  }

  if (durationSeconds < ANTI_CHEAT_RULES.minSessionSecondsForRanking && distanceKm > 1) {
    return {
      status: 'pending',
      reason: 'Distance trop élevée pour une durée aussi courte.',
    }
  }

  if (route && route.length > 1) {
    for (let i = 1; i < route.length; i++) {
      const a = route[i - 1]
      const b = route[i]
      const seconds = Math.max(1, (b.timestamp - a.timestamp) / 1000)
      const jump = haversineKm(a.lat, a.lng, b.lat, b.lng)
      const jumpSpeed = (jump / seconds) * 3600
      if (jump > ANTI_CHEAT_RULES.maxDistanceJumpKm || jumpSpeed > speedLimits[type] * 1.5) {
        return {
          status: 'pending',
          reason: 'Saut GPS anormal détecté (signal suspect).',
        }
      }
    }
  }

  if (!Number.isFinite(distanceKm) || distanceKm <= 0) {
    return { status: 'rejected', reason: 'Distance invalide.' }
  }

  return { status: 'validated' }
}

export function isDuplicateActivity(candidate: Activity, existing: Activity[]): boolean {
  return existing.some(
    (a) =>
      a.userId === candidate.userId &&
      Math.abs(new Date(a.startedAt).getTime() - new Date(candidate.startedAt).getTime()) <
        60_000 &&
      Math.abs(a.distanceKm - candidate.distanceKm) < 0.01,
  )
}

export function haversineKm(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371
  const dLat = ((lat2 - lat1) * Math.PI) / 180
  const dLng = ((lng2 - lng1) * Math.PI) / 180
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
