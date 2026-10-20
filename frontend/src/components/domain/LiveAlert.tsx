import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { Capacitor } from '@capacitor/core'
import { LocalNotifications } from '@capacitor/local-notifications'
import { Radio, X } from 'lucide-react'
import type { LiveSession } from '@/types'
import { api } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { notifyNotificationsChanged } from '@/hooks/useNotifications'

const SEEN_KEY = 'fitlife:lives-alerted'
const POLL_MS = 8000

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(SEEN_KEY) ?? '[]') as string[]
  } catch {
    return []
  }
}

function saveSeen(ids: string[]): void {
  try {
    localStorage.setItem(SEEN_KEY, JSON.stringify(ids.slice(-50)))
  } catch {
    /* stockage indisponible */
  }
}

/** Notification Android (application en arrière-plan ou écran verrouillé). */
async function nativeAlert(live: LiveSession): Promise<void> {
  if (!Capacitor.isNativePlatform()) return
  try {
    const perm = await LocalNotifications.checkPermissions()
    if (perm.display !== 'granted') return
    await LocalNotifications.schedule({
      notifications: [
        {
          id: Math.floor(Math.random() * 2_000_000_000),
          title: `${live.coachName} est en direct`,
          body: `${live.title} vient de commencer. Rejoins la séance !`,
          extra: { liveId: live.id },
        },
      ],
    })
  } catch {
    /* notifications indisponibles */
  }
}

/**
 * Alerte « live en cours » : dès qu'un hôte lance un direct, chaque membre connecté voit
 * une bannière (et reçoit une notification Android), où qu'il soit dans l'application.
 */
export function LiveAlert() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()
  const [alert, setAlert] = useState<LiveSession | null>(null)
  const first = useRef(true)

  // Autorisation des notifications Android + ouverture du live au toucher de la notification.
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return
    LocalNotifications.requestPermissions().catch(() => undefined)
    const sub = LocalNotifications.addListener('localNotificationActionPerformed', (action) => {
      const liveId = (action.notification.extra as { liveId?: string } | undefined)?.liveId
      if (liveId) navigate(`/lives/${liveId}`)
    })
    return () => {
      void sub.then((s) => s.remove())
    }
  }, [navigate])

  useEffect(() => {
    if (!user) return
    let active = true
    const check = async () => {
      let lives: LiveSession[] = []
      try {
        lives = await api.getLives()
      } catch {
        return
      }
      if (!active) return
      const seen = readSeen()
      // L'hôte ne reçoit pas l'alerte de son propre direct.
      const fresh = lives.filter((l) => l.status === 'live' && !seen.includes(l.id) && l.hostUserId !== user.id)
      if (fresh.length === 0) {
        first.current = false
        return
      }
      saveSeen([...seen, ...fresh.map((l) => l.id)])
      setAlert(fresh[0])
      notifyNotificationsChanged()
      if (!first.current || document.hidden) void nativeAlert(fresh[0])
      first.current = false
    }
    void check()
    const t = window.setInterval(check, POLL_MS)
    return () => {
      active = false
      window.clearInterval(t)
    }
  }, [user])

  // Inutile d'afficher la bannière quand on est déjà dans la salle du live.
  useEffect(() => {
    if (alert && pathname === `/lives/${alert.id}`) setAlert(null)
  }, [alert, pathname])

  if (!alert) return null
  return (
    <div className="fixed inset-x-3 top-3 z-[55] mx-auto max-w-md animate-slide-up lg:left-auto lg:right-6 lg:mx-0 lg:w-96">
      <div className="flex items-center gap-3 rounded-3xl border border-red-500/40 bg-ink-800/95 p-3 shadow-card backdrop-blur-xl">
        <span className="relative grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-red-500 text-white">
          <Radio size={20} />
          <span className="absolute -right-0.5 -top-0.5 h-3 w-3 animate-ping rounded-full bg-red-400" />
        </span>
        <button
          type="button"
          className="min-w-0 flex-1 text-left"
          onClick={() => {
            navigate(`/lives/${alert.id}`)
            setAlert(null)
          }}
        >
          <span className="block text-[11px] font-bold uppercase tracking-wider text-red-300">En direct maintenant</span>
          <span className="block truncate text-sm font-bold text-white">{alert.coachName} · {alert.title}</span>
          <span className="block text-xs text-white/55">Touche pour rejoindre</span>
        </button>
        <button type="button" onClick={() => setAlert(null)} className="grid h-8 w-8 place-items-center rounded-xl text-white/50 hover:text-white" aria-label="Fermer">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
