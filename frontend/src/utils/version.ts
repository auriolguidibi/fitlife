import { Capacitor } from '@capacitor/core'

/** Numéro de version (numéro de construction GitHub) et support : application Android ou site web. */
export const APP_VERSION = (import.meta.env.VITE_APP_VERSION as string | undefined) || 'dev'

export function versionLabel(): string {
  const app = import.meta.env.VITE_TARGET === 'app' || Capacitor.isNativePlatform()
  return `${app ? 'Application Android' : 'Site web'} · version ${APP_VERSION}`
}
