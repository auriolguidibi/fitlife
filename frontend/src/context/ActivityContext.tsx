import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Activity, ActivityType, GpsPoint } from '@/types'
import { api } from '@/services'
import { haversineKm } from '@/utils/antiCheat'
import { caloriesFromActivity, estimateStepsFromDistance } from '@/utils/fitness'
import { round } from '@/utils/id'
import { strideMeters } from '@/utils/stepCounter'
import { useAuth } from './AuthContext'
import { useSteps } from './StepsContext'

/**
 * gps : vraie géolocalisation (+ capteur de pas) ·
 * steps : GPS indisponible, la distance est calculée à partir des vrais pas détectés.
 * Plus aucune simulation : sans GPS ni capteur de pas, la session ne démarre pas.
 */
export type TrackingMode = 'gps' | 'steps'

interface ActivityContextValue {
  activity: Activity | null
  status: Activity['status'] | 'idle'
  elapsedSeconds: number
  distanceKm: number
  steps: number
  currentSpeedKmh: number
  avgSpeedKmh: number
  calories: number
  route: GpsPoint[]
  currentPosition: GpsPoint | null
  loading: boolean
  mode: TrackingMode | null
  /** Information sur le suivi (GPS faible, perdu…). */
  gpsNotice: string | null
  /** Précision du dernier point GPS, en mètres. */
  accuracyM: number | null
  /** Raison pour laquelle la session n'a pas pu démarrer. */
  startError: string | null
  start: (type: ActivityType) => Promise<void>
  pause: () => void
  resume: () => void
  finish: () => Promise<{ flagged: boolean; reason?: string; distanceKm: number } | null>
  discard: () => Promise<void>
}

const ActivityContext = createContext<ActivityContextValue | undefined>(undefined)

/** Points GPS trop imprécis ignorés (m). */
const MAX_ACCURACY_M = 25
/** Déplacement minimal pris en compte (m) : en dessous, c'est le bruit du GPS à l'arrêt. */
const MIN_STEP_M = 6
/** Vitesse maximale plausible entre deux points (km/h), au-delà : saut GPS ignoré. */
const MAX_JUMP_KMH: Record<ActivityType, number> = { walk: 15, run: 30, bike: 70, other: 70 }
/** Marche / course : sans pas détecté depuis ce délai, on considère que tu es à l'arrêt. */
const STILL_AFTER_MS = 12000

function geoErrorMessage(err: GeolocationPositionError | null): string {
  if (!err) return 'GPS indisponible sur cet appareil.'
  if (err.code === err.PERMISSION_DENIED) return 'Accès à la position refusé : active la localisation de FitLife dans les réglages du téléphone.'
  if (err.code === err.TIMEOUT) return 'Signal GPS introuvable. Va à l’extérieur, à découvert, puis réessaie.'
  return 'Position introuvable. Vérifie que la localisation du téléphone est activée.'
}

function firstFix(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(null)
      return
    }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 20000, maximumAge: 0 })
  })
}

export function ActivityProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { todaySteps, source: stepSource, problem: stepProblem } = useSteps()
  const [activity, setActivity] = useState<Activity | null>(null)
  const [elapsedSeconds, setElapsed] = useState(0)
  const [distanceKm, setDistance] = useState(0)
  const [route, setRoute] = useState<GpsPoint[]>([])
  const [currentPosition, setCurrentPosition] = useState<GpsPoint | null>(null)
  const [loading, setLoading] = useState(false)
  const [currentSpeedKmh, setCurrentSpeed] = useState(0)
  const [mode, setMode] = useState<TrackingMode | null>(null)
  const [gpsNotice, setGpsNotice] = useState<string | null>(null)
  const [accuracyM, setAccuracy] = useState<number | null>(null)
  const [startError, setStartError] = useState<string | null>(null)
  const [sessionSteps, setSessionSteps] = useState(0)

  const clockRef = useRef<number | null>(null)
  const watchRef = useRef<number | null>(null)
  const elapsedRef = useRef(0)
  const movingRef = useRef(0)
  const distanceRef = useRef(0)
  const routeRef = useRef<GpsPoint[]>([])
  const accRef = useRef<number[]>([])
  const activityRef = useRef<Activity | null>(null)
  const modeRef = useRef<TrackingMode | null>(null)
  const runningRef = useRef(false)
  const stepsRef = useRef(0)
  const lastSeenStepsRef = useRef<number | null>(null)
  const lastStepAtRef = useRef(0)
  const hasStepSensor = stepSource === 'native' || stepSource === 'motion'
  const sensorRef = useRef(hasStepSensor)
  sensorRef.current = hasStepSensor

  const weight = user?.weight ?? 75
  const usesFeet = (type?: ActivityType) => type === 'walk' || type === 'run'
  // Pas : capteur du téléphone ; sinon (vélo / pas de capteur) estimation depuis la distance GPS.
  const steps = hasStepSensor && usesFeet(activity?.type) ? sessionSteps : estimateStepsFromDistance(distanceKm)
  const avgSpeedKmh = movingRef.current > 0 ? round(distanceKm / (movingRef.current / 3600), 1) : 0
  const calories = activity ? caloriesFromActivity(distanceKm, weight, activity.type) : 0

  /* Vrais pas détectés pendant la session (hors pauses). */
  useEffect(() => {
    const prev = lastSeenStepsRef.current
    lastSeenStepsRef.current = todaySteps
    if (prev === null || !runningRef.current) return
    const delta = todaySteps - prev
    if (delta <= 0 || delta > 500) return // changement de jour ou resynchronisation
    stepsRef.current += delta
    lastStepAtRef.current = Date.now()
    setSessionSteps(stepsRef.current)
    // Sans GPS : la distance vient des pas.
    if (modeRef.current === 'steps') {
      const type = activityRef.current?.type
      distanceRef.current = round(distanceRef.current + (delta * strideMeters(user?.height, type === 'run')) / 1000, 3)
      setDistance(distanceRef.current)
    }
  }, [todaySteps, user?.height])

  /** Ajoute un point GPS s'il correspond à un vrai déplacement. */
  const addPoint = useCallback((point: GpsPoint, accuracy: number) => {
    const last = routeRef.current[routeRef.current.length - 1]
    setCurrentPosition(point)
    if (!last) {
      routeRef.current = [point]
      accRef.current = [accuracy]
      setRoute(routeRef.current)
      return
    }
    const type = activityRef.current?.type ?? 'walk'
    const segKm = haversineKm(last.lat, last.lng, point.lat, point.lng)
    const hours = Math.max(1, point.timestamp - last.timestamp) / 3600e3
    const lastAcc = accRef.current[accRef.current.length - 1] ?? accuracy
    // Le déplacement doit dépasser l'imprécision du GPS, sinon c'est du bruit.
    if (segKm * 1000 < Math.max(MIN_STEP_M, (accuracy + lastAcc) / 2)) {
      setCurrentSpeed(0)
      return
    }
    if (segKm / hours > MAX_JUMP_KMH[type]) return // saut GPS
    // Marche / course avec capteur de pas : aucun pas récent = tu ne bouges pas (dérive GPS).
    if (usesFeet(type) && sensorRef.current && Date.now() - lastStepAtRef.current > STILL_AFTER_MS) {
      routeRef.current = [...routeRef.current.slice(0, -1), point]
      setCurrentSpeed(0)
      return
    }
    routeRef.current = [...routeRef.current, { ...point, speed: point.speed || round(segKm / hours, 1) }]
    accRef.current = [...accRef.current, accuracy]
    distanceRef.current = round(distanceRef.current + segKm, 3)
    setRoute(routeRef.current)
    setDistance(distanceRef.current)
    setCurrentSpeed(round(point.speed || segKm / hours, 1))
  }, [])

  const stopTracking = useCallback(() => {
    runningRef.current = false
    if (clockRef.current !== null) {
      window.clearInterval(clockRef.current)
      clockRef.current = null
    }
    if (watchRef.current !== null) {
      navigator.geolocation.clearWatch(watchRef.current)
      watchRef.current = null
    }
  }, [])

  const startTracking = useCallback(() => {
    stopTracking()
    runningRef.current = true
    clockRef.current = window.setInterval(() => {
      elapsedRef.current += 1
      // Temps en mouvement : uniquement quand un vrai déplacement est détecté.
      const recentStep = Date.now() - lastStepAtRef.current < 4000
      const last = routeRef.current[routeRef.current.length - 1]
      const recentGps = !!last && Date.now() - last.timestamp < 6000 && last.speed > 0.5
      if (recentStep || recentGps) movingRef.current += 1
      setElapsed(elapsedRef.current)
    }, 1000)
    if (modeRef.current === 'gps') {
      watchRef.current = navigator.geolocation.watchPosition(
        (pos) => {
          setAccuracy(Math.round(pos.coords.accuracy))
          if (pos.coords.accuracy > MAX_ACCURACY_M) {
            setGpsNotice('Signal GPS faible : les points imprécis sont ignorés.')
            return
          }
          setGpsNotice(null)
          addPoint(
            {
              lat: pos.coords.latitude,
              lng: pos.coords.longitude,
              timestamp: pos.timestamp,
              speed: pos.coords.speed != null && pos.coords.speed >= 0 ? round(pos.coords.speed * 3.6, 1) : 0,
            },
            pos.coords.accuracy,
          )
        },
        () => setGpsNotice('Signal GPS perdu… le trajet reprendra dès que la position revient.'),
        { enableHighAccuracy: true, maximumAge: 0, timeout: 20000 },
      )
    }
  }, [stopTracking, addPoint])

  const reset = useCallback(() => {
    setActivity(null)
    activityRef.current = null
    routeRef.current = []
    accRef.current = []
    distanceRef.current = 0
    elapsedRef.current = 0
    movingRef.current = 0
    stepsRef.current = 0
    setSessionSteps(0)
    setRoute([])
    setDistance(0)
    setElapsed(0)
    setCurrentPosition(null)
    setCurrentSpeed(0)
    setAccuracy(null)
    setMode(null)
    modeRef.current = null
    setGpsNotice(null)
  }, [])

  const start = useCallback(
    async (type: ActivityType) => {
      setLoading(true)
      setStartError(null)
      try {
        let first: GpsPoint | null = null
        let nextMode: TrackingMode = 'gps'
        let notice: string | null = null
        try {
          const pos = await firstFix()
          first = { lat: pos.coords.latitude, lng: pos.coords.longitude, timestamp: pos.timestamp, speed: 0 }
          setAccuracy(Math.round(pos.coords.accuracy))
          accRef.current = [pos.coords.accuracy]
        } catch (err) {
          const msg = geoErrorMessage(err && typeof err === 'object' && 'code' in err ? (err as GeolocationPositionError) : null)
          if (usesFeet(type) && sensorRef.current) {
            // Sans GPS, la marche et la course restent mesurées avec les vrais pas.
            nextMode = 'steps'
            notice = `${msg} Distance calculée avec tes pas.`
          } else {
            setStartError(usesFeet(type) && stepProblem ? `${msg} ${stepProblem}` : msg)
            return
          }
        }
        const created = await api.startActivity({ type })
        activityRef.current = created
        setActivity(created)
        modeRef.current = nextMode
        setMode(nextMode)
        setGpsNotice(notice)
        routeRef.current = first ? [first] : []
        distanceRef.current = 0
        elapsedRef.current = 0
        movingRef.current = 0
        stepsRef.current = 0
        lastStepAtRef.current = 0
        lastSeenStepsRef.current = todaySteps
        setSessionSteps(0)
        setRoute(routeRef.current)
        setCurrentPosition(first)
        setDistance(0)
        setElapsed(0)
        startTracking()
      } catch (err) {
        setStartError(err instanceof Error ? err.message : 'Impossible de démarrer la session.')
      } finally {
        setLoading(false)
      }
    },
    [startTracking, stepProblem, todaySteps],
  )

  const snapshot = () => {
    const type = activityRef.current?.type
    return {
      route: routeRef.current,
      distanceKm: distanceRef.current,
      steps: sensorRef.current && usesFeet(type) ? stepsRef.current : estimateStepsFromDistance(distanceRef.current),
      durationSeconds: elapsedRef.current,
      movingSeconds: movingRef.current,
    }
  }

  const pause = useCallback(() => {
    stopTracking()
    setActivity((prev) => (prev ? { ...prev, status: 'paused' } : prev))
    if (activityRef.current) void api.updateActivity(activityRef.current.id, { status: 'paused', ...snapshot() })
  }, [stopTracking])

  const resume = useCallback(() => {
    setActivity((prev) => (prev ? { ...prev, status: 'active' } : prev))
    if (activityRef.current) void api.updateActivity(activityRef.current.id, { status: 'active' })
    startTracking()
  }, [startTracking])

  const finish = useCallback(async () => {
    stopTracking()
    const current = activityRef.current
    if (!current) return null
    await api.updateActivity(current.id, {
      ...snapshot(),
      maxSpeedKmh: Math.max(...routeRef.current.map((p) => p.speed), 0),
      calories: caloriesFromActivity(distanceRef.current, weight, current.type),
    })
    const result = await api.finishActivity(current.id)
    const distance = distanceRef.current
    reset()
    return { flagged: result.flagged, reason: result.reason, distanceKm: distance }
  }, [stopTracking, weight, reset])

  const discard = useCallback(async () => {
    stopTracking()
    const current = activityRef.current
    reset()
    if (current) {
      try {
        await api.cancelActivity(current.id)
      } catch {
        /* déjà supprimée */
      }
    }
  }, [stopTracking, reset])

  useEffect(() => () => stopTracking(), [stopTracking])

  return (
    <ActivityContext.Provider
      value={{
        activity,
        status: activity?.status ?? 'idle',
        elapsedSeconds,
        distanceKm,
        steps,
        currentSpeedKmh,
        avgSpeedKmh,
        calories,
        route,
        currentPosition,
        loading,
        mode,
        gpsNotice,
        accuracyM,
        startError,
        start,
        pause,
        resume,
        finish,
        discard,
      }}
    >
      {children}
    </ActivityContext.Provider>
  )
}

export function useActivity(): ActivityContextValue {
  const ctx = useContext(ActivityContext)
  if (!ctx) throw new Error('useActivity doit être utilisé dans ActivityProvider')
  return ctx
}
