import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  Eye,
  Salad,
  LayoutDashboard,
  Megaphone,
  MessageCircle,
  Ticket,
  Pencil,
  Pin,
  PinOff,
  Play,
  Radio,
  ShieldAlert,
  ShieldCheck,
  Square,
  Trash2,
  Users,
} from 'lucide-react'
import type { Announcement, FitEvent, LiveSession } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Badge, Button, Card, EmptyState, Spinner, StatCard, Tabs } from '@/components/ui'
import { PageHero } from '@/components/layout/PageHero'
import { SectionTitle } from '@/components/layout/PageHero'
import { AnnouncementCard } from '@/components/domain/AnnouncementCard'
import { eventDateParts } from '@/components/domain/EventCard'
import { liveImage, pageHeroes } from '@/data/images'
import { eventCategoryLabels, levelLabels } from '@/utils/labels'
import { formatDateTime, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import { AnnouncementFormModal, ConfirmModal, EventFormModal, LiveFormModal } from './forms'
import type { LiveFormValues } from './forms'
import { MenuManager } from './MenuManager'
import { CoachInbox } from './CoachInbox'
import { PromoCodesManager } from './PromoCodesManager'
import { isAdmin, isSuperAdmin } from '@/utils/roles'

type Section = 'overview' | 'messages' | 'lives' | 'events' | 'menu' | 'announcements' | 'promo'
const SECTIONS: Section[] = ['overview', 'messages', 'lives', 'events', 'menu', 'announcements', 'promo']
type LiveFilter = 'scheduled' | 'live' | 'ended'

interface Data {
  lives: LiveSession[]
  events: FitEvent[]
  announcements: Announcement[]
}

type Dialog =
  | { kind: 'live'; item?: LiveSession; startNow?: boolean }
  | { kind: 'event'; item?: FitEvent }
  | { kind: 'announcement'; item?: Announcement }
  | { kind: 'delete'; what: 'live' | 'event' | 'announcement'; id: string; label: string }
  | null

const isUpcoming = (iso: string, minutes = 0) => new Date(iso).getTime() + minutes * 60e3 > Date.now()

function IconAction({ label, onClick, danger, children }: { label: string; onClick: () => void; danger?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={cn(
        'grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/[0.03] text-white/60 transition',
        danger ? 'hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300' : 'hover:border-fit/40 hover:text-white',
      )}
    >
      {children}
    </button>
  )
}

export function ManagementPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [section, setSection] = useState<Section>(() => {
    const s = params.get('section') as Section | null
    return s && SECTIONS.includes(s) ? s : 'overview'
  })
  const [liveFilter, setLiveFilter] = useState<LiveFilter>('scheduled')
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [toast, setToast] = useState('')

  const { data, loading, setData } = useAsync<Data>(async () => {
    const [lives, events, announcements] = await Promise.all([api.getLives(), api.getEvents(), api.getAnnouncements(true)])
    return { lives, events, announcements }
  }, [])

  if (loading || !data) return <Spinner label="Chargement de l’Espace Gestion…" />

  const adminView = isAdmin(user)
  const fullName = `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim()
  // Le live est animé par le coach (ou l'admin) connecté : pas de coach fictif.
  const defaultCoach = { id: user?.id ?? '', name: user?.role === 'coach' ? fullName : fullName || 'Équipe FitLife' }

  const liveNow = data.lives.filter((l) => l.status === 'live')
  const scheduled = data.lives.filter((l) => l.status === 'scheduled')
  const upcomingEvents = data.events.filter((e) => isUpcoming(e.startsAt, e.durationMinutes))
  const activeAnnouncements = data.announcements.filter((a) => !a.expiresAt || isUpcoming(a.expiresAt))

  const open = (d: Dialog) => {
    setDialogKey((k) => k + 1)
    setDialog(d)
  }
  const flash = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  /* ----- Actions ----- */
  const saveLive = async (v: LiveFormValues, existing?: LiveSession) => {
    const payload: Partial<LiveSession> = {
      title: v.title,
      description: v.description,
      coachId: v.coachId,
      coachName: v.coachName,
      durationMinutes: v.durationMinutes,
      level: v.level,
      premiumOnly: v.premiumOnly,
      ...(v.scheduledAt && !v.startNow ? { scheduledAt: v.scheduledAt } : {}),
    }
    if (existing) {
      const updated = await api.updateLive(existing.id, payload)
      setData({ ...data, lives: data.lives.map((l) => (l.id === updated.id ? updated : l)) })
      flash('Live mis à jour')
    } else {
      const created = await api.createLive({ ...payload, ...(v.startNow ? { status: 'live' as const } : {}) })
      setData({ ...data, lives: [created, ...data.lives] })
      if (v.startNow) {
        // Direct immédiat : on ouvre le studio, la caméra s'allume.
        navigate(`/lives/${created.id}?studio=1`)
        return
      }
      flash('Live programmé, les membres ont été prévenus.')
    }
  }

  const setLiveStatus = async (live: LiveSession, status: LiveSession['status']) => {
    const updated = await api.setLiveStatus(live.id, status)
    setData({ ...data, lives: data.lives.map((l) => (l.id === updated.id ? updated : l)) })
    if (status === 'live') {
      navigate(`/lives/${live.id}?studio=1`)
      return
    }
    flash('Live terminé')
  }

  const saveEvent = async (input: Parameters<typeof api.createEvent>[0], existing?: FitEvent) => {
    if (existing) {
      const updated = await api.updateEvent(existing.id, input)
      setData({ ...data, events: data.events.map((e) => (e.id === updated.id ? updated : e)) })
      flash('Événement mis à jour')
    } else {
      const created = await api.createEvent(input)
      setData({ ...data, events: [...data.events, created].sort((a, b) => a.startsAt.localeCompare(b.startsAt)) })
      flash('Événement publié, les membres ont été prévenus.')
    }
  }

  const saveAnnouncement = async (input: Parameters<typeof api.createAnnouncement>[0], existing?: Announcement) => {
    if (existing) {
      const updated = await api.updateAnnouncement(existing.id, input)
      setData({ ...data, announcements: data.announcements.map((a) => (a.id === updated.id ? updated : a)) })
      flash('Annonce actualisée')
    } else {
      const created = await api.createAnnouncement(input)
      setData({ ...data, announcements: [created, ...data.announcements] })
      flash('Annonce publiée')
    }
  }

  const togglePin = async (a: Announcement) => {
    const updated = await api.updateAnnouncement(a.id, { pinned: !a.pinned })
    setData({ ...data, announcements: data.announcements.map((x) => (x.id === updated.id ? updated : x)) })
  }

  const confirmDelete = async (what: 'live' | 'event' | 'announcement', id: string) => {
    if (what === 'live') {
      await api.deleteLive(id)
      setData({ ...data, lives: data.lives.filter((l) => l.id !== id) })
    } else if (what === 'event') {
      await api.deleteEvent(id)
      setData({ ...data, events: data.events.filter((e) => e.id !== id) })
    } else {
      await api.deleteAnnouncement(id)
      setData({ ...data, announcements: data.announcements.filter((a) => a.id !== id) })
    }
    flash('Supprimé')
  }

  /* ----- Agenda combiné (lives + événements à venir) ----- */
  const agenda = [
    ...scheduled.map((l) => ({ id: l.id, at: l.scheduledAt, title: l.title, sub: `Live · ${l.coachName}`, kind: 'live' as const })),
    ...upcomingEvents.map((e) => ({ id: e.id, at: e.startsAt, title: e.title, sub: `${eventCategoryLabels[e.category]} · ${e.attendees} inscrit${e.attendees > 1 ? 's' : ''}`, kind: 'event' as const })),
  ]
    .sort((a, b) => a.at.localeCompare(b.at))
    .slice(0, 5)

  const visibleLives = data.lives
    .filter((l) => l.status === liveFilter)
    .sort((a, b) => (liveFilter === 'ended' ? b.scheduledAt.localeCompare(a.scheduledAt) : a.scheduledAt.localeCompare(b.scheduledAt)))

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow={adminView ? 'Administration du groupe' : 'Espace Coach'}
        title="Espace Gestion"
        subtitle="Lance tes lives, programme les événements et tiens les membres informés."
        icon={<ShieldCheck size={22} />}
        image={pageHeroes.coachSpace}
        actions={
          <div className="hidden items-center gap-2 sm:flex">
          {isSuperAdmin(user) && (
            <Link to="/super-admin">
              <Button variant="secondary" leftIcon={<ShieldAlert size={16} />}>
                Super admin
              </Button>
            </Link>
          )}
          <Button
            onClick={() => open({ kind: 'live', startNow: true })}
            leftIcon={<Radio size={16} />}
            className="bg-red-500 text-white shadow-[0_10px_30px_-12px_rgba(239,68,68,0.7)] hover:bg-red-600"
          >
            Passer en direct
          </Button>
          </div>
        }
      />

      {/* Téléphone : actions principales en pleine largeur */}
      <div className={cn('grid gap-2 sm:hidden', isSuperAdmin(user) ? 'grid-cols-[1fr_1fr_auto]' : 'grid-cols-2')}>
        <Button onClick={() => open({ kind: 'live', startNow: true })} leftIcon={<Radio size={16} />} className="bg-red-500 text-white shadow-none hover:bg-red-600">
          Direct
        </Button>
        <Button variant="secondary" onClick={() => open({ kind: 'live' })} leftIcon={<CalendarPlus size={16} />}>
          Programmer
        </Button>
        {isSuperAdmin(user) && (
          <Link to="/super-admin" aria-label="Espace Super admin">
            <Button variant="secondary" size="icon" className="h-full w-12">
              <ShieldAlert size={16} />
            </Button>
          </Link>
        )}
      </div>

      {/* Sections : grille sur téléphone (tout est visible, sans défilement horizontal). */}
      <nav className="grid grid-cols-4 gap-1 rounded-2xl border sm:grid-cols-7 border-white/[0.06] bg-ink-800/80 p-1 backdrop-blur">
        {(
          [
            { value: 'overview', label: 'Accueil', icon: LayoutDashboard, count: undefined },
            { value: 'messages', label: 'Messages', icon: MessageCircle, count: undefined },
            { value: 'lives', label: 'Lives', icon: Radio, count: scheduled.length + liveNow.length },
            { value: 'events', label: 'Agenda', icon: CalendarDays, count: upcomingEvents.length },
            { value: 'menu', label: 'Repas', icon: Salad, count: undefined },
            { value: 'announcements', label: 'Annonces', icon: Megaphone, count: activeAnnouncements.length },
            { value: 'promo', label: 'Codes promo', icon: Ticket, count: undefined },
          ] as { value: Section; label: string; icon: typeof Radio; count?: number }[]
        ).map(({ value, label, icon: Icon, count }) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={cn(
              'relative flex min-w-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[10px] font-semibold transition sm:flex-row sm:justify-center sm:gap-2 sm:px-3 sm:py-2.5 sm:text-sm',
              section === value ? 'bg-gradient-to-b from-fit to-fit-dark text-white shadow-fit' : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
            )}
          >
            <Icon size={17} className="shrink-0" />
            <span className="max-w-full truncate">{label}</span>
            {!!count && (
              <span
                className={cn(
                  'absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[9px] font-bold sm:static sm:h-auto sm:text-[10px]',
                  section === value ? 'bg-ink-900/20' : 'bg-fit text-white sm:bg-white/10 sm:text-white',
                )}
              >
                {count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {/* ---------- Tableau de bord ---------- */}
      {section === 'overview' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard label="En direct" value={liveNow.length} icon={<Radio size={14} />} accent={liveNow.length > 0} />
            <StatCard label="Programmés" value={scheduled.length} icon={<CalendarPlus size={14} />} />
            <StatCard label="Événements" value={upcomingEvents.length} icon={<CalendarDays size={14} />} />
            <StatCard label="Annonces" value={activeAnnouncements.length} icon={<Megaphone size={14} />} />
          </div>

          {liveNow.length > 0 && (
            <section className="min-w-0">
              <SectionTitle title="En direct maintenant" icon={<Radio />} />
              <div className="space-y-2.5">
                {liveNow.map((live) => (
                  <Card key={live.id} padding="sm" className="border-red-500/30">
                    <div className="flex items-center gap-3">
                      <div className="relative h-14 w-16 shrink-0 overflow-hidden rounded-xl sm:h-16 sm:w-24">
                        <img src={liveImage(live.title, 300)} alt="" className="h-full w-full object-cover" />
                        <span className="absolute left-1.5 top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 ring-2 ring-ink-900" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-bold text-white">{live.title}</p>
                        <p className="flex items-center gap-1.5 truncate text-xs text-white/50">
                          <Eye size={12} className="shrink-0" /> {formatNumber(live.viewers)} · {live.coachName}
                        </p>
                      </div>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <Button variant="secondary" size="sm" onClick={() => navigate(`/lives/${live.id}`)} leftIcon={<Eye size={14} />}>
                        Ouvrir
                      </Button>
                      <Button variant="danger" size="sm" onClick={() => setLiveStatus(live, 'ended')} leftIcon={<Square size={14} />}>
                        Terminer
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            </section>
          )}

          <section>
            <SectionTitle title="Actions rapides" />
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-3 lg:grid-cols-5">
              {[
                { label: 'Passer en direct', sub: 'Démarre un live tout de suite', icon: Radio, tone: 'text-red-300 bg-red-500/15', onClick: () => open({ kind: 'live', startNow: true }) },
                { label: 'Programmer un live', sub: 'Date, coach, niveau', icon: CalendarPlus, tone: 'text-fit bg-fit/15', onClick: () => open({ kind: 'live' }) },
                { label: 'Créer un événement', sub: 'Course, atelier, rencontre', icon: CalendarDays, tone: 'text-sky-300 bg-sky-400/15', onClick: () => open({ kind: 'event' }) },
                { label: 'Menu du jour', sub: 'Aliments et descriptions', icon: Salad, tone: 'text-lime-300 bg-lime-400/15', onClick: () => setSection('menu') },
                { label: 'Publier une annonce', sub: 'Info à tous les membres', icon: Megaphone, tone: 'text-amber-300 bg-amber-400/15', onClick: () => open({ kind: 'announcement' }) },
              ].map(({ label, sub, icon: Icon, tone, onClick }) => (
                <button
                  key={label}
                  type="button"
                  onClick={onClick}
                  className="surface group flex items-center gap-3 rounded-2xl p-3 text-left transition hover:border-white/15 sm:rounded-3xl lg:flex-col lg:items-start lg:p-4"
                >
                  <span className={cn('grid h-10 w-10 shrink-0 place-items-center rounded-xl transition group-hover:scale-110 lg:h-11 lg:w-11 lg:rounded-2xl', tone)}>
                    <Icon size={19} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-bold text-white">{label}</span>
                    <span className="block truncate text-xs text-white/45">{sub}</span>
                  </span>
                  <ChevronRight size={16} className="shrink-0 text-white/25 lg:hidden" />
                </button>
              ))}
            </div>
          </section>

          <div className="grid min-w-0 gap-5 lg:grid-cols-2">
            <section className="min-w-0">
              <SectionTitle title="Agenda à venir" icon={<CalendarDays />} />
              {agenda.length === 0 ? (
                <EmptyState title="Rien de programmé" description="Programme un live ou crée un événement." />
              ) : (
                <Card padding="none" className="divide-y divide-white/[0.06]">
                  {agenda.map((item) => {
                    const d = eventDateParts(item.at)
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setSection(item.kind === 'live' ? 'lives' : 'events')}
                        className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-white/[0.03]"
                      >
                        <span className="grid w-12 shrink-0 place-items-center rounded-xl bg-white/[0.05] py-1">
                          <span className="font-display text-base font-extrabold leading-none text-white">{d.day}</span>
                          <span className="text-[10px] font-semibold uppercase text-fit">{d.month}</span>
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-semibold text-white">{item.title}</span>
                          <span className="block truncate text-xs text-white/45">
                            {d.time} · {item.sub}
                          </span>
                        </span>
                        {item.kind === 'live' ? <Radio size={16} className="text-white/30" /> : <CalendarDays size={16} className="text-white/30" />}
                      </button>
                    )
                  })}
                </Card>
              )}
            </section>

            <section className="min-w-0">
              <SectionTitle
                title="Dernières annonces"
                icon={<Megaphone />}
                action={
                  <button onClick={() => setSection('announcements')} className="text-xs font-semibold text-fit">
                    Tout gérer
                  </button>
                }
              />
              <div className="space-y-3">
                {activeAnnouncements.slice(0, 2).map((a) => (
                  <AnnouncementCard key={a.id} announcement={a} />
                ))}
                {activeAnnouncements.length === 0 && <EmptyState title="Aucune annonce active" />}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* ---------- Lives ---------- */}
      {section === 'lives' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Tabs
              value={liveFilter}
              onChange={setLiveFilter}
              className="w-full sm:flex-1"
              tabs={[
                { value: 'scheduled', label: 'À venir', count: scheduled.length },
                { value: 'live', label: 'En direct', count: liveNow.length },
                { value: 'ended', label: 'Terminés' },
              ]}
            />
            <div className="hidden gap-2 sm:flex">
              <Button onClick={() => open({ kind: 'live', startNow: true })} leftIcon={<Radio size={16} />} className="bg-red-500 text-white shadow-none hover:bg-red-600">
                Direct
              </Button>
              <Button variant="secondary" onClick={() => open({ kind: 'live' })} leftIcon={<CalendarPlus size={16} />}>
                Programmer
              </Button>
            </div>
          </div>

          {visibleLives.length === 0 ? (
            <EmptyState icon={<Radio size={30} />} title="Aucun live dans cette catégorie" />
          ) : (
            <div className="space-y-3">
              {visibleLives.map((live) => (
                <Card key={live.id} padding="sm" className="flex flex-col gap-3 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-3">
                  <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl sm:w-28">
                    <img src={liveImage(live.title, 300)} alt="" className="h-full w-full object-cover" />
                    {live.status === 'live' && <span className="absolute left-1.5 top-1.5 h-2.5 w-2.5 animate-pulse rounded-full bg-red-500 ring-2 ring-ink-900" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 text-sm font-bold text-white">{live.title}</p>
                    <p className="truncate text-xs text-white/50">
                      {formatDateTime(live.scheduledAt)} · {live.durationMinutes} min
                    </p>
                    <p className="truncate text-xs text-white/40">{live.coachName}</p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      <Badge tone="gray">{levelLabels[live.level]}</Badge>
                      {live.premiumOnly && <Badge tone="amber">Premium</Badge>}
                      {live.status !== 'scheduled' && (
                        <Badge tone="gray">
                          <Users size={10} /> {formatNumber(live.viewers)}
                        </Badge>
                      )}
                    </div>
                  </div>
                  </div>
                  <div className="flex shrink-0 items-center justify-end gap-1.5 border-t border-white/[0.06] pt-3 sm:border-0 sm:pt-0">
                    {live.status === 'scheduled' && (
                      <Button size="sm" className="mr-auto sm:mr-0" onClick={() => setLiveStatus(live, 'live')} leftIcon={<Play size={14} />}>
                        Démarrer
                      </Button>
                    )}
                    {live.status === 'live' && (
                      <Button size="sm" variant="danger" className="mr-auto sm:mr-0" onClick={() => setLiveStatus(live, 'ended')} leftIcon={<Square size={14} />}>
                        Terminer
                      </Button>
                    )}
                    {live.status !== 'ended' && (
                      <IconAction label="Modifier" onClick={() => open({ kind: 'live', item: live })}>
                        <Pencil size={15} />
                      </IconAction>
                    )}
                    <IconAction label="Supprimer" danger onClick={() => open({ kind: 'delete', what: 'live', id: live.id, label: live.title })}>
                      <Trash2 size={15} />
                    </IconAction>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Événements ---------- */}
      {section === 'events' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/55">
              {upcomingEvents.length} à venir · {data.events.length - upcomingEvents.length} passé{data.events.length - upcomingEvents.length > 1 ? 's' : ''}
            </p>
            <Button onClick={() => open({ kind: 'event' })} leftIcon={<CalendarPlus size={16} />}>
              Créer un événement
            </Button>
          </div>
          {data.events.length === 0 ? (
            <EmptyState icon={<CalendarDays size={30} />} title="Aucun événement" description="Crée le premier rendez-vous de la communauté." />
          ) : (
            <div className="space-y-3">
              {[...upcomingEvents, ...data.events.filter((e) => !upcomingEvents.includes(e)).reverse()].map((event) => {
                const d = eventDateParts(event.startsAt)
                const past = !upcomingEvents.includes(event)
                return (
                  <Card key={event.id} padding="sm" className={cn('flex flex-col gap-3 sm:flex-row sm:items-center', past && 'opacity-55')}>
                    <div className="flex min-w-0 flex-1 items-center gap-3">
                    <div className="relative h-16 w-20 shrink-0 overflow-hidden rounded-2xl sm:w-28">
                      {event.coverUrl && <img src={event.coverUrl} alt="" className="h-full w-full object-cover" />}
                      <span className="absolute bottom-1 left-1 rounded-lg bg-white px-1.5 py-0.5 text-[10px] font-extrabold text-ink-900">
                        {d.day} {d.month}
                      </span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-bold text-white">{event.title}</p>
                      <p className="truncate text-xs text-white/50">
                        {eventCategoryLabels[event.category]} · {d.time} · {event.location}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-fit">
                        {event.attendees} inscrit{event.attendees > 1 ? 's' : ''}
                        {event.capacity !== null && <span className="font-normal text-white/40"> / {event.capacity} places</span>}
                        {past && <span className="font-normal text-white/40"> · terminé</span>}
                      </p>
                    </div>
                    </div>
                    <div className="flex shrink-0 justify-end gap-1.5 border-t border-white/[0.06] pt-3 sm:border-0 sm:pt-0">
                      <IconAction label="Modifier" onClick={() => open({ kind: 'event', item: event })}>
                        <Pencil size={15} />
                      </IconAction>
                      <IconAction label="Supprimer" danger onClick={() => open({ kind: 'delete', what: 'event', id: event.id, label: event.title })}>
                        <Trash2 size={15} />
                      </IconAction>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ---------- Alimentation ---------- */}
      {section === 'menu' && <MenuManager onToast={flash} />}

      {section === 'messages' && <CoachInbox />}

      {section === 'promo' && <PromoCodesManager onToast={flash} />}

      {/* ---------- Annonces ---------- */}
      {section === 'announcements' && (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-white/55">Affichées sur l’accueil de tous les membres.</p>
            <Button onClick={() => open({ kind: 'announcement' })} leftIcon={<Megaphone size={16} />}>
              Publier
            </Button>
          </div>
          {data.announcements.length === 0 ? (
            <EmptyState icon={<Megaphone size={30} />} title="Aucune annonce" description="Publie une information pour toute la communauté." />
          ) : (
            <div className="space-y-3">
              {[...data.announcements]
                .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
                .map((a) => (
                  <AnnouncementCard
                    key={a.id}
                    announcement={a}
                    actions={
                      <>
                        <IconAction label={a.pinned ? 'Désépingler' : 'Épingler'} onClick={() => togglePin(a)}>
                          {a.pinned ? <PinOff size={15} /> : <Pin size={15} />}
                        </IconAction>
                        <IconAction label="Actualiser" onClick={() => open({ kind: 'announcement', item: a })}>
                          <Pencil size={15} />
                        </IconAction>
                        <IconAction label="Supprimer" danger onClick={() => open({ kind: 'delete', what: 'announcement', id: a.id, label: a.title })}>
                          <Trash2 size={15} />
                        </IconAction>
                      </>
                    }
                  />
                ))}
            </div>
          )}
        </div>
      )}

      {/* ---------- Fenêtres ---------- */}
      {dialog?.kind === 'live' && (
        <LiveFormModal
          key={dialogKey}
          open
          onClose={() => setDialog(null)}
          initial={dialog.item}
          defaultCoach={defaultCoach}
          startNow={dialog.startNow}
          onSubmit={(v) => saveLive(v, dialog.item)}
        />
      )}
      {dialog?.kind === 'event' && (
        <EventFormModal key={dialogKey} open onClose={() => setDialog(null)} initial={dialog.item} onSubmit={(v) => saveEvent(v, dialog.item)} />
      )}
      {dialog?.kind === 'announcement' && (
        <AnnouncementFormModal
          key={dialogKey}
          open
          onClose={() => setDialog(null)}
          initial={dialog.item}
          onSubmit={(v) => saveAnnouncement(v, dialog.item)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmModal
          key={dialogKey}
          open
          title="Supprimer définitivement ?"
          message={`« ${dialog.label} » sera supprimé pour tous les membres. Cette action est irréversible.`}
          onConfirm={() => confirmDelete(dialog.what, dialog.id)}
          onClose={() => setDialog(null)}
        />
      )}

      {toast && (
        <div className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-sm animate-slide-up rounded-2xl border border-fit/30 bg-ink-800/95 px-4 py-3 text-center text-sm font-semibold text-white shadow-card backdrop-blur lg:bottom-8">
          {toast}
        </div>
      )}
    </div>
  )
}
