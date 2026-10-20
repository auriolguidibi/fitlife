/**
 * Adresse du serveur. Vide = même origine que l'application (site web servi par l'API PHP).
 * Dans l'APK Android, l'application tourne en local : VITE_API_URL doit pointer vers le serveur
 * en ligne (ex. https://fitlife.up.railway.app).
 */
export const API_ORIGIN = (import.meta.env.VITE_API_URL ?? '').replace(/\/+$/, '')

/** Chemin servi par le serveur (ex. /uploads/avatars/…) → URL complète. */
export function serverUrl(path?: string | null): string | undefined {
  if (!path) return undefined
  return path.startsWith('/uploads/') ? `${API_ORIGIN}${path}` : path
}
