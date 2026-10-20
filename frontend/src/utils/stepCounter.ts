import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'

/**
 * Podomètre réel.
 * - Application Android : capteur matériel de pas du téléphone (compte aussi application fermée).
 * - Navigateur : accéléromètre du téléphone, uniquement pendant que la page est ouverte.
 * Jamais de pas inventés : sans capteur, le compteur reste à zéro et on le dit.
 */

interface StepCounterNative {
  status(): Promise<{ available: boolean; permission: string }>
  requestPermission(): Promise<{ available: boolean; permission: string }>
  start(): Promise<{ today: number; date: string }>
  stop(): Promise<void>
  addListener(event: 'steps', cb: (data: { today: number; date: string }) => void): Promise<PluginListenerHandle>
}

const NativeSteps = registerPlugin<StepCounterNative>('StepCounter')

export type StepSource = 'native' | 'motion' | 'none'

export interface StepWatch {
  source: StepSource
  /** Message à afficher quand aucun capteur n'est utilisable. */
  problem?: string
  stop: () => void
}

/** Détection de pas par l'accéléromètre (navigateur) : pics réguliers au rythme de la marche. */
class MotionStepDetector {
  private smooth = 9.81
  private baseline = 9.81
  private above = false
  private lastStep = 0
  private pending: number[] = []
  private walking = false
  constructor(private onStep: (n: number) => void) {}

  handle = (e: DeviceMotionEvent) => {
    const a = e.accelerationIncludingGravity
    if (!a || a.x == null || a.y == null || a.z == null) return
    const mag = Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z)
    this.smooth = this.smooth * 0.75 + mag * 0.25 // filtre passe-bas (bruit)
    this.baseline = this.baseline * 0.98 + mag * 0.02 // gravité moyenne
    const now = performance.now()
    const high = this.smooth > this.baseline + 1.3
    const low = this.smooth < this.baseline + 0.4
    if (high && !this.above) {
      this.above = true
      const gap = now - this.lastStep
      // Un pas : entre 0,25 s et 2 s après le précédent.
      if (gap >= 250 && gap <= 2000) {
        if (this.walking) {
          this.onStep(1)
        } else {
          // On ne commence à compter qu'après 4 pas réguliers (secousses ignorées).
          this.pending.push(now)
          if (this.pending.length >= 4) {
            this.walking = true
            this.onStep(this.pending.length)
            this.pending = []
          }
        }
      } else {
        this.walking = false
        this.pending = [now]
      }
      this.lastStep = now
    } else if (low) {
      this.above = false
    }
    if (now - this.lastStep > 2500) {
      this.walking = false
      this.pending = []
    }
  }
}

/**
 * Écoute les pas de la journée. `onToday` reçoit le total du jour (Android) ou les pas
 * ajoutés depuis le début de l'écoute (navigateur, `delta`).
 */
export async function watchSteps(handlers: {
  onToday?: (today: number, date: string) => void
  onDelta?: (steps: number) => void
}): Promise<StepWatch> {
  if (Capacitor.isNativePlatform()) {
    try {
      let st = await NativeSteps.status()
      if (!st.available) return { source: 'none', problem: 'Ton téléphone n’a pas de capteur de pas.', stop: () => undefined }
      if (st.permission !== 'granted') st = await NativeSteps.requestPermission()
      if (st.permission !== 'granted') {
        return { source: 'none', problem: 'Autorise « Activité physique » dans les réglages de FitLife pour compter tes pas.', stop: () => undefined }
      }
      let last = -1
      const handle = await NativeSteps.addListener('steps', ({ today, date }) => {
        if (today !== last) handlers.onDelta?.(last >= 0 ? Math.max(0, today - last) : 0)
        last = today
        handlers.onToday?.(today, date)
      })
      const first = await NativeSteps.start()
      last = first.today
      handlers.onToday?.(first.today, first.date)
      return {
        source: 'native',
        stop: () => {
          void handle.remove()
        },
      }
    } catch (err) {
      return { source: 'none', problem: err instanceof Error ? err.message : 'Podomètre indisponible.', stop: () => undefined }
    }
  }

  // Navigateur : accéléromètre (iPhone : autorisation demandée).
  if (typeof window === 'undefined' || !('DeviceMotionEvent' in window)) {
    return { source: 'none', problem: 'Cet appareil n’a pas de capteur de mouvement : installe l’application pour compter tes pas.', stop: () => undefined }
  }
  const DME = window.DeviceMotionEvent as unknown as { requestPermission?: () => Promise<string> }
  if (typeof DME.requestPermission === 'function') {
    try {
      if ((await DME.requestPermission()) !== 'granted') {
        return { source: 'none', problem: 'Accès aux capteurs de mouvement refusé.', stop: () => undefined }
      }
    } catch {
      return { source: 'none', problem: 'Accès aux capteurs de mouvement refusé.', stop: () => undefined }
    }
  }
  const detector = new MotionStepDetector((n) => handlers.onDelta?.(n))
  let gotEvent = false
  const listener = (e: DeviceMotionEvent) => {
    gotEvent = true
    detector.handle(e)
  }
  window.addEventListener('devicemotion', listener)
  // Ordinateur : aucun événement de mouvement n'arrive.
  await new Promise((r) => setTimeout(r, 1200))
  if (!gotEvent) {
    window.removeEventListener('devicemotion', listener)
    return { source: 'none', problem: 'Pas de capteur de mouvement sur cet appareil : utilise ton téléphone ou l’application.', stop: () => undefined }
  }
  return { source: 'motion', stop: () => window.removeEventListener('devicemotion', listener) }
}

/** Longueur de pas estimée à partir de la taille (m). */
export function strideMeters(heightCm: number | undefined, running = false): number {
  const h = heightCm && heightCm > 100 ? heightCm : 170
  return (h / 100) * (running ? 0.65 : 0.415)
}
