/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_DATA_MODE?: 'mock' | 'api'
  readonly VITE_APP_VERSION?: string
  /** Adresse du serveur (APK Android), ex. https://fitlife.up.railway.app */
  readonly VITE_API_URL?: string
  /** Lien de téléchargement de l'APK (bouton « Télécharger l'application » du site web). */
  readonly VITE_APK_URL?: string
  /** « app » pour la version compilée dans l'APK (masque le bouton de téléchargement). */
  readonly VITE_TARGET?: 'web' | 'app'
  readonly VITE_TURN_URL?: string
  readonly VITE_TURN_USER?: string
  readonly VITE_TURN_PASS?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
