import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { api } from '@/services'
import { todayKey } from '@/utils/id'
import { watchSteps } from '@/utils/stepCounter'
import type { StepSource, StepWatch } from '@/utils/stepCounter'
import { useAuth } from './AuthContext'

interface StepsContextValue {
  /** Pas réellement détectés aujourd'hui par le capteur du téléphone. */
  todaySteps: number
  source: StepSource | null
  /** Pourquoi le podomètre ne fonctionne pas (pas de capteur, autorisation refusée…). */
  problem: string | null
  /** Relance le podomètre (après avoir accordé l'autorisation). */
  enable: () => Promise<void>
}

const StepsContext = createContext<StepsContextValue | undefined>(undefined)

/** Podomètre de la journée : vrai capteur de pas, enregistré régulièrement sur le compte. */
export function StepsProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const [todaySteps, setToday] = useState(0)
  const [source, setSource] = useState<StepSource | null>(null)
  const [problem, setProblem] = useState<string | null>(null)
  const watchRef = useRef<StepWatch | null>(null)
  const stepsRef = useRef(0)
  const dayRef = useRef(todayKey())
  const savedRef = useRef({ steps: 0, at: 0 })

  const save = useCallback((force = false) => {
    const steps = stepsRef.current
    const now = Date.now()
    if (steps <= savedRef.current.steps) return
    if (!force && steps - savedRef.current.steps < 25 && now - savedRef.current.at < 30000) return
    savedRef.current = { steps, at: now }
    void api.setSteps(dayRef.current, steps).catch(() => undefined)
  }, [])

  const setSteps = useCallback(
    (steps: number, date = todayKey()) => {
      if (date !== dayRef.current) {
        save(true)
        dayRef.current = date
        savedRef.current = { steps: 0, at: 0 }
      }
      stepsRef.current = steps
      setToday(steps)
      save()
    },
    [save],
  )

  const enable = useCallback(async () => {
    watchRef.current?.stop()
    const baseDay = todayKey()
    const base = await api.getSteps(baseDay).catch(() => 0)
    let webSteps = base
    stepsRef.current = Math.max(stepsRef.current, base)
    setToday(stepsRef.current)
    const watch = await watchSteps({
      // Application Android : total du jour fourni par le capteur matériel
      // (jamais en dessous de ce qui est déjà enregistré sur le compte pour ce jour).
      onToday: (today, date) => setSteps(date === baseDay ? Math.max(today, base) : today, date),
      // Navigateur : on ajoute les pas détectés pendant que la page est ouverte.
      onDelta: (n) => {
        if (watchRef.current?.source === 'native') return
        const day = todayKey()
        if (day !== dayRef.current) webSteps = 0
        webSteps += n
        setSteps(webSteps, day)
      },
    })
    watchRef.current = watch
    setSource(watch.source)
    setProblem(watch.problem ?? null)
  }, [setSteps])

  useEffect(() => {
    if (!user) return
    void enable()
    const flush = () => save(true)
    window.addEventListener('pagehide', flush)
    document.addEventListener('visibilitychange', flush)
    return () => {
      save(true)
      watchRef.current?.stop()
      watchRef.current = null
      window.removeEventListener('pagehide', flush)
      document.removeEventListener('visibilitychange', flush)
    }
  }, [user?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  return <StepsContext.Provider value={{ todaySteps, source, problem, enable }}>{children}</StepsContext.Provider>
}

export function useSteps(): StepsContextValue {
  const ctx = useContext(StepsContext)
  if (!ctx) throw new Error('useSteps doit être utilisé dans StepsProvider')
  return ctx
}
