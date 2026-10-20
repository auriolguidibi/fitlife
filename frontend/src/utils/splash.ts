/**
 * Retire l'écran de chargement d'index.html (logo dessiné puis brillant) une fois
 * l'application montée ET l'animation terminée. Un toucher sur l'écran le ferme aussitôt.
 */
declare global {
  interface Window {
    __splashStartedAt?: number
    __splashSkip?: boolean
    __hideSplash?: () => void
  }
}

/** Durée de l'animation depuis le début du dessin (anneau + logo + lettres + slogan). */
const ANIMATION_MS = 2500

export function hideSplashWhenReady(): void {
  const splash = document.getElementById('splash')
  if (!splash) return

  let done = false
  const hide = () => {
    if (done) return
    done = true
    splash.classList.add('leaving')
    window.setTimeout(() => splash.remove(), 550)
  }
  window.__hideSplash = hide
  if (window.__splashSkip) return hide()

  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const waitForEnd = () => {
    const started = window.__splashStartedAt
    if (started === undefined) {
      // Le dessin démarre dès que le logo est chargé : on patiente.
      window.setTimeout(waitForEnd, 100)
      return
    }
    const remaining = (reduced ? 600 : ANIMATION_MS) - (performance.now() - started)
    window.setTimeout(hide, Math.max(0, remaining))
  }
  waitForEnd()
}
