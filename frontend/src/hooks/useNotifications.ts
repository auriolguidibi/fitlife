import { useEffect, useState } from 'react'
import { api } from '@/services'

const EVENT = 'fitlife:notifications'

/** Prévient les compteurs de notifications qu'ils doivent se mettre à jour. */
export function notifyNotificationsChanged(): void {
  window.dispatchEvent(new Event(EVENT))
}

export function useUnreadNotifications(): number {
  const [count, setCount] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      try {
        const list = await api.getNotifications()
        if (active) setCount(list.filter((n) => !n.read).length)
      } catch {
        /* not authenticated */
      }
    }
    void load()
    const id = window.setInterval(load, 10000)
    window.addEventListener(EVENT, load)
    return () => {
      active = false
      window.clearInterval(id)
      window.removeEventListener(EVENT, load)
    }
  }, [])

  return count
}
