import { useState } from 'react'
import { CalendarDays } from 'lucide-react'
import type { FitEvent } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { EmptyState, Spinner, Tabs } from '@/components/ui'
import { EventCard } from '@/components/domain/EventCard'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

type Filter = 'upcoming' | 'mine' | 'past'

const isPast = (e: FitEvent) => new Date(e.startsAt).getTime() + e.durationMinutes * 60e3 < Date.now()

export function EventsPage() {
  const { data, loading, setData } = useAsync(() => api.getEvents(), [])
  const [filter, setFilter] = useState<Filter>('upcoming')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')

  if (loading || !data) return <Spinner label="Chargement des événements…" />

  const upcoming = data.filter((e) => !isPast(e))
  const lists: Record<Filter, FitEvent[]> = {
    upcoming,
    mine: upcoming.filter((e) => e.attending),
    past: data.filter(isPast).reverse(),
  }
  const visible = lists[filter]

  const toggle = async (event: FitEvent) => {
    setError('')
    setBusyId(event.id)
    try {
      const updated = await api.toggleEventAttendance(event.id)
      setData(data.map((e) => (e.id === updated.id ? updated : e)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setBusyId(null)
    }
  }

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Agenda de la communauté"
        title="Événements"
        subtitle="Courses collectives, ateliers, bootcamps : retrouve-toi en vrai avec les coachs et les membres."
        icon={<CalendarDays size={22} />}
        image={pageHeroes.challenges}
      />

      <Tabs
        value={filter}
        onChange={setFilter}
        tabs={[
          { value: 'upcoming', label: 'À venir', count: lists.upcoming.length },
          { value: 'mine', label: 'Mes inscriptions', count: lists.mine.length },
          { value: 'past', label: 'Passés' },
        ]}
      />

      {error && (
        <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
      )}

      {visible.length === 0 ? (
        <EmptyState
          icon={<CalendarDays size={32} />}
          title={filter === 'mine' ? 'Aucune inscription pour le moment' : 'Aucun événement ici'}
          description={filter === 'mine' ? 'Inscris-toi à un événement à venir pour le retrouver ici.' : 'Les prochains rendez-vous apparaîtront ici dès qu’ils seront programmés.'}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {visible.map((event) => (
            <EventCard key={event.id} event={event} onToggle={toggle} busy={busyId === event.id} />
          ))}
        </div>
      )}
    </div>
  )
}
