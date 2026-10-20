import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import {
  Apple,
  CalendarDays,
  ChevronRight,
  Clapperboard,
  Droplets,
  Footprints,
  MapPin,
  MessageCircle,
  Moon,
  PartyPopper,
  Minus,
  Play,
  Plus,
  Square,
  Radio,
  Sun,
  Sunset,
  Target,
  Users,
  UtensilsCrossed,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Announcement, Challenge, ChallengeParticipation, FitEvent, LiveSession, NutritionPlan, WorkoutProgram } from '@/types'
import { AnnouncementStrip } from '@/components/domain/AnnouncementStrip'
import { EventCard } from '@/components/domain/EventCard'
import { DailyRings } from '@/components/domain/DailyRings'
import { FitnessActivities } from '@/components/domain/FitnessActivities'
import type { RingSpec } from '@/components/domain/DailyRings'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { useActivity } from '@/context/ActivityContext'
import { useSteps } from '@/context/StepsContext'
import { Avatar, AvatarStack, Badge, Card, ProgressBar, Spinner } from '@/components/ui'
import { heroImages } from '@/data/images'
import { MealCard } from '@/components/domain/MealCard'
import { LiveCard } from '@/components/domain/LiveCard'
import { goalLabels } from '@/utils/labels'
import { formatNumber } from '@/utils/format'
import { daysAgoKey, todayKey } from '@/utils/id'
import { workoutImage } from '@/data/images'
import { challengeIcon, goalIcons, TypeIcon } from '@/components/ui'
import { cn } from '@/utils/cn'

const STEP_GOAL = 10000
const WATER_STEP = 250

function greeting(): string {
  const h = new Date().getHours()
  if (h < 5) return 'Encore debout'
  if (h < 12) return 'Bonjour'
  if (h < 18) return 'Bon après-midi'
  return 'Bonsoir'
}

function GreetingIcon() {
  const h = new Date().getHours()
  const Icon = h >= 5 && h < 12 ? Sun : h < 18 ? Sunset : Moon
  return <Icon size={15} className="-mt-0.5 inline text-amber-300" />
}

/** Message selon le nombre d'anneaux bouclés aujourd'hui. */
function dayMessage(closed: number, pctAvg: number): string {
  if (closed === 3) return 'Journée parfaite. Les 3 anneaux sont bouclés !'
  if (closed === 2) return 'Plus qu’un anneau pour une journée parfaite.'
  if (pctAvg >= 50) return 'Tu es sur la bonne lancée, continue !'
  if (pctAvg > 0) return 'Beau départ, chaque geste compte.'
  return 'Ta journée commence : boucle tes 3 anneaux.'
}

const coachTips = [
  { coach: 'Coach Awa', text: 'Pas besoin d’une heure : 20 minutes bien faites valent mieux qu’une séance repoussée à demain.' },
  { coach: 'Coach Amina', text: 'Bois un grand verre d’eau dès le réveil. Ton corps vient de passer 8 heures sans hydratation.' },
  { coach: 'Coach Koffi', text: 'Sur le cardio, si tu peux encore parler en courant, tu es dans la bonne zone pour brûler des graisses.' },
  { coach: 'Coach David', text: 'Le muscle se construit au repos. Dormir 7 h, c’est aussi faire partie de l’entraînement.' },
  { coach: 'Coach Amina', text: 'Remplis la moitié de ton assiette de légumes avant de servir le reste. Simple et redoutable.' },
  { coach: 'Coach Awa', text: 'Les jours sans motivation, enfile juste ta tenue. Le plus souvent, la séance suit toute seule.' },
  { coach: 'Coach Koffi', text: '10 minutes de marche après le repas aident vraiment la digestion et la glycémie.' },
]

const shortcuts: { to: string; label: string; icon: LucideIcon; tone: string }[] = [
  { to: '/nutrition', label: 'Nutrition', icon: Apple, tone: 'bg-lime-400/15 text-lime-300' },
  { to: '/activity', label: 'Podomètre', icon: MapPin, tone: 'bg-fit/15 text-fit' },
  { to: '/lives', label: 'Lives', icon: Radio, tone: 'bg-red-500/15 text-red-300' },
  { to: '/videos', label: 'Vidéos', icon: Clapperboard, tone: 'bg-violet-400/15 text-violet-300' },
  { to: '/events', label: 'Événements', icon: CalendarDays, tone: 'bg-sky-400/15 text-sky-300' },
  { to: '/challenges', label: 'Défis', icon: Target, tone: 'bg-amber-400/15 text-amber-300' },
  { to: '/coach', label: 'Mon coach', icon: MessageCircle, tone: 'bg-emerald-400/15 text-emerald-300' },
  { to: '/community', label: 'Communauté', icon: Users, tone: 'bg-pink-400/15 text-pink-300' },
]

interface HomeData {
  program: WorkoutProgram
  nutrition: NutritionPlan
  steps: number
  week: number[]
  eatenKcal: number
  waterMl: number
  lives: LiveSession[]
  challenges: Challenge[]
  participations: ChallengeParticipation[]
  announcements: Announcement[]
  events: FitEvent[]
}

function SectionHead({ icon: Icon, title, to, linkLabel }: { icon: LucideIcon; title: string; to?: string; linkLabel?: string }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-3">
      <h2 className="flex items-center gap-2 font-display text-lg font-bold text-white">
        <Icon size={18} className="text-fit" /> {title}
      </h2>
      {to && (
        <Link to={to} className="shrink-0 text-xs font-semibold text-fit">
          {linkLabel}
        </Link>
      )}
    </div>
  )
}

export function HomePage() {
  const { user, preferences } = useAuth()
  const navigate = useNavigate()
  const [addingWater, setAddingWater] = useState(false)
  const activity = useActivity()
  const { todaySteps, problem: stepProblem } = useSteps()
  const walking = activity.status === 'active' || activity.status === 'paused'

  const { data, loading, setData, reload } = useAsync<HomeData>(async () => {
    const today = todayKey()
    const [program, nutrition, steps, meals, water, lives, challenges, participations, announcements, events] = await Promise.all([
      api.getProgram(),
      api.getNutritionPlan(),
      api.getSteps(today),
      api.getMealLogs(today).catch(() => []),
      api.getWaterLog(today).catch(() => ({ date: today, ml: 0 })),
      api.getLives(),
      api.getChallenges(),
      api.getParticipations(),
      api.getAnnouncements(),
      api.getEvents(),
    ])
    const week = await Promise.all(Array.from({ length: 7 }, (_, i) => api.getSteps(daysAgoKey(6 - i)).catch(() => 0)))
    const eatenKcal = meals.reduce((t, m) => t + m.calories, 0)
    return { program, nutrition, steps, week, eatenKcal, waterMl: water.ml, lives, challenges, participations, announcements, events }
  }, [])

  if (loading || !data) return <Spinner label="Préparation de ta journée…" />

  const { program, nutrition, eatenKcal, waterMl, lives, challenges, participations } = data
  // Pas du jour : capteur du téléphone en direct (jamais de valeur inventée).
  const steps = Math.max(data.steps, todaySteps)
  const waterGoalMl = Math.round(nutrition.hydrationTarget * 1000)
  const todayWorkout = program.weeks[program.currentWeek - 1]?.workouts[0]
  const dayIndex = (new Date().getDay() + 6) % 7
  const todayMeals = nutrition.week[dayIndex]?.meals ?? []
  const upcomingLives = lives.filter((l) => l.status !== 'ended').slice(0, 2)
  const liveNow = lives.find((l) => l.status === 'live')
  const joined = new Set(participations.map((p) => p.challengeId))
  const todayChallenge = challenges.find((c) => !joined.has(c.id)) ?? challenges[0]
  const tip = coachTips[new Date().getDate() % coachTips.length]
  const upcomingEvents = data.events.filter((e) => new Date(e.startsAt).getTime() > Date.now())

  const changeWater = async (ml: number) => {
    setAddingWater(true)
    try {
      const log = await api.addWater(ml)
      setData({ ...data, waterMl: log.ml })
    } finally {
      setAddingWater(false)
    }
  }
  const clock = `${Math.floor(activity.elapsedSeconds / 60)}:${String(activity.elapsedSeconds % 60).padStart(2, '0')}`

  type RingAction = { label: string; icon: LucideIcon; onClick: () => void; busy?: boolean; disabled?: boolean; tone?: 'primary' | 'stop'; aria?: string }
  const rings: (RingSpec & { icon: LucideIcon; text: string; actions: RingAction[] })[] = [
    {
      key: 'move',
      label: 'Bouger',
      value: steps,
      goal: STEP_GOAL,
      colors: ['#86EFAC', '#22C55E'],
      icon: Footprints,
      text: walking
        ? `Marche en cours · ${activity.distanceKm.toFixed(2).replace('.', ',')} km`
        : activity.startError ?? (stepProblem ? `${formatNumber(steps)} pas · ${stepProblem}` : `${formatNumber(steps)} / ${formatNumber(STEP_GOAL)} pas`),
      // Démarrer une marche => le même bouton devient « Arrêter » (avec le chrono) tant qu'elle dure.
      actions: walking
        ? [{ label: `Arrêter · ${clock}`, icon: Square, tone: 'stop', busy: activity.loading, onClick: async () => { await activity.finish(); reload() } }]
        : [{ label: 'Marcher', icon: Play, tone: 'primary', busy: activity.loading, onClick: () => void activity.start('walk') }],
    },
    {
      key: 'eat',
      label: 'Manger',
      value: eatenKcal,
      goal: nutrition.dailyCalories,
      colors: ['#FFC67A', '#FF8B3D'],
      icon: UtensilsCrossed,
      text: `${formatNumber(eatenKcal)} / ${formatNumber(nutrition.dailyCalories)} kcal`,
      actions: [{ label: 'Repas', icon: Plus, onClick: () => navigate('/nutrition') }],
    },
    {
      key: 'drink',
      label: 'Boire',
      value: waterMl,
      goal: waterGoalMl,
      colors: ['#8BE0FF', '#4CC9FF'],
      icon: Droplets,
      text: `${(waterMl / 1000).toFixed(2).replace('.', ',')} / ${(waterGoalMl / 1000).toString().replace('.', ',')} L`,
      actions: [
        { label: '', icon: Minus, aria: `Retirer un verre (${WATER_STEP} ml)`, busy: addingWater, disabled: waterMl <= 0, onClick: () => void changeWater(-WATER_STEP) },
        { label: `${WATER_STEP} ml`, icon: Plus, busy: addingWater, onClick: () => void changeWater(WATER_STEP) },
      ],
    },
  ]
  const pcts = rings.map((r) => (r.goal > 0 ? Math.min(1, r.value / r.goal) : 0))
  const closed = pcts.filter((p) => p >= 1).length
  const pctAvg = Math.round((pcts.reduce((t, p) => t + p, 0) / 3) * 100)
  const dateLabel = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="space-y-6 animate-fade-in">
      {/* En-tête */}
      <header className="flex items-center gap-3">
        <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} src={user?.avatarUrl} size="lg" ring />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-white/60">
            {greeting()}, {user?.firstName} <GreetingIcon />
          </p>
          <h1 className="font-display text-3xl font-bold leading-tight tracking-tight text-white sm:text-4xl">Ma journée</h1>
        </div>
        <span className="hidden shrink-0 rounded-full border border-white/10 bg-ink-700 px-3.5 py-2 text-xs font-bold capitalize text-white/75 sm:inline-flex">
          {dateLabel}
        </span>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-fit/30 bg-fit/10 px-3 py-2 text-xs font-extrabold text-fit">
          Sem. {program.currentWeek}/{program.durationWeeks}
        </span>
      </header>

      {/* Les 3 anneaux du jour */}
      <section className="relative overflow-hidden rounded-[2rem] border border-white/[0.07] bg-gradient-to-br from-ink-700 via-ink-800 to-ink-900 p-5 shadow-[0_24px_60px_-30px_rgba(0,0,0,0.9)] sm:p-7">
        <div className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-fit/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -left-16 h-56 w-56 rounded-full bg-sky-500/10 blur-3xl" />
        <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
          <div className="relative grid shrink-0 place-items-center">
            <DailyRings rings={rings} size={208} />
            <div className="absolute inset-0 grid place-items-center text-center">
              {closed === 3 ? (
                <PartyPopper size={34} className="text-amber-300" />
              ) : (
                <div>
                  <p className="font-display text-3xl font-extrabold text-white">{pctAvg}%</p>
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-white/45">du jour</p>
                </div>
              )}
            </div>
          </div>

          <div className="w-full min-w-0 flex-1 space-y-3">
            <p className={cn('text-center text-sm font-semibold sm:text-left', closed === 3 ? 'text-amber-300' : 'text-white/75')}>
              {dayMessage(closed, pctAvg)}
            </p>
            {rings.map((r, i) => {
              const Icon = r.icon
              const done = pcts[i] >= 1
              return (
                <div key={r.key} className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-2.5 pr-2">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl text-ink-900"
                    style={{ background: `linear-gradient(135deg, ${r.colors[0]}, ${r.colors[1]})` }}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-sm font-bold text-white">
                      {r.label}
                      {done && <span className="rounded-full bg-fit/20 px-1.5 text-[10px] font-bold text-fit">OK</span>}
                    </p>
                    <p className="truncate text-xs text-white/55">{r.text}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-1.5">
                    {r.actions.map((a) => {
                      const ActionIcon = a.icon
                      return (
                        <button
                          key={a.aria ?? a.label}
                          type="button"
                          onClick={a.onClick}
                          disabled={a.busy || a.disabled}
                          aria-label={a.aria}
                          title={a.aria}
                          className={cn(
                            'inline-flex h-9 items-center gap-1 rounded-full px-3 text-xs font-bold transition disabled:opacity-40',
                            a.tone === 'stop'
                              ? 'bg-red-500 text-white hover:bg-red-600'
                              : a.tone === 'primary'
                                ? 'bg-fit text-white hover:bg-fit-dark'
                                : 'border border-white/10 bg-white/[0.06] text-white hover:border-white/25 hover:bg-white/10',
                            !a.label && 'w-9 justify-center px-0',
                          )}
                        >
                          <ActionIcon size={13} /> {a.label}
                        </button>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Live en cours */}
      {liveNow && (
        <Link to={`/lives/${liveNow.id}`} className="block">
          <div className="flex items-center gap-3 rounded-3xl border border-red-500/30 bg-gradient-to-r from-red-500/15 to-red-500/5 p-3.5">
            <span className="relative">
              <Avatar name={liveNow.coachName} src={liveNow.coachAvatarUrl} size="md" />
              <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-red-500 px-1.5 text-[9px] font-bold text-white">LIVE</span>
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{liveNow.title}</p>
              <p className="truncate text-xs text-white/60">
                {liveNow.coachName} · {formatNumber(liveNow.viewers)} spectateurs
              </p>
            </div>
            <span className="shrink-0 rounded-full bg-red-500 px-3 py-1.5 text-xs font-bold text-white">Rejoindre</span>
          </div>
        </Link>
      )}

      {/* Ma semaine : un anneau de pas par jour */}
      <section className="rounded-[1.75rem] border border-white/[0.07] bg-ink-700 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-white">Ma semaine</h2>
          <span className="text-xs font-semibold text-white/50">{formatNumber(data.week.slice(0, 6).reduce((t, v) => t + v, 0) + steps)} pas</span>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center">
          {data.week.map((v, i) => {
            const d = new Date(Date.now() - (6 - i) * 864e5)
            const today = i === 6
            const pct = Math.min(1, (today ? steps : v) / STEP_GOAL)
            const c = 2 * Math.PI * 17
            return (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <span className={cn('text-[11px] font-semibold capitalize', today ? 'text-fit' : 'text-white/45')}>
                  {d.toLocaleDateString('fr-FR', { weekday: 'short' }).replace('.', '')}
                </span>
                <span className="relative grid h-11 w-11 place-items-center">
                  <svg viewBox="0 0 40 40" className="absolute inset-0 h-full w-full -rotate-90" aria-hidden="true">
                    <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="3.5" />
                    {pct > 0 && <circle cx="20" cy="20" r="17" fill="none" stroke="#22C55E" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={`${c * pct} ${c}`} />}
                  </svg>
                  <span className={cn('grid h-8 w-8 place-items-center rounded-full text-xs font-bold', today ? 'bg-fit text-white' : 'text-white')}>{d.getDate()}</span>
                </span>
              </div>
            )
          })}
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2">
        {todayChallenge && (
          <Link
            to="/challenges"
            className="group flex min-h-[11rem] flex-col justify-between rounded-[1.75rem] bg-gradient-to-br from-[#22C55E] to-[#0F7A3A] p-5 text-white shadow-fit transition hover:-translate-y-0.5"
          >
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-white/15">
              <TypeIcon icon={challengeIcon(todayChallenge.id)} size={20} />
            </span>
            <div>
              <p className="font-display text-xl font-bold leading-tight">{todayChallenge.title}</p>
              <p className="mt-1 text-sm font-semibold text-white/80">{formatNumber(todayChallenge.participants)} participants · Rejoindre</p>
            </div>
          </Link>
        )}
        {todayWorkout && (
          <button
            type="button"
            onClick={() => navigate(`/workout/${todayWorkout.id}`)}
            className="group relative min-h-[11rem] overflow-hidden rounded-[1.75rem] text-left"
          >
            <img src={workoutImage(todayWorkout.type, 800)} alt="" className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105" />
            <span className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/40 to-transparent" />
            <span className="absolute left-4 top-4 rounded-full bg-ink-900/70 px-3 py-1 text-[11px] font-extrabold text-fit backdrop-blur">SÉANCE DU JOUR</span>
            <span className="absolute bottom-4 left-4 right-20">
              <span className="block font-display text-xl font-bold text-white">{todayWorkout.name}</span>
              <span className="block text-sm text-white/70">
                {todayWorkout.duration} min · {todayWorkout.exercises.length} exercices · {todayWorkout.calories} kcal
              </span>
            </span>
            <span className="absolute bottom-4 right-4 grid h-12 w-12 place-items-center rounded-full bg-fit text-white shadow-fit transition group-hover:scale-110">
              <Play size={20} fill="currentColor" className="ml-0.5" />
            </span>
          </button>
        )}
      </div>

      {todayWorkout && (
        <div className="-mt-2 flex items-center gap-3 px-1">
          <Badge tone="fit" dot>
            <TypeIcon icon={goalIcons[preferences?.goal ?? 'fitness']} size={12} />
            {goalLabels[preferences?.goal ?? 'fitness']}
          </Badge>
          <div className="min-w-0 flex-1">
            <ProgressBar value={program.progress} />
          </div>
          <Link to="/program" className="shrink-0 text-xs font-semibold text-fit">
            Mon programme
          </Link>
        </div>
      )}

      {/* Activités fitness avec vidéos FR / EN */}
      <FitnessActivities />

      {/* Raccourcis */}
      <section className="grid grid-cols-4 gap-2 sm:gap-3 lg:grid-cols-8">
        {shortcuts.map(({ to, label, icon: Icon, tone }) => (
          <Link
            key={to}
            to={to}
            className="group flex flex-col items-center gap-1.5 rounded-2xl border border-white/[0.06] bg-white/[0.02] px-1 py-3 text-center transition hover:-translate-y-0.5 hover:border-white/15"
          >
            <span className={cn('grid h-11 w-11 place-items-center rounded-2xl transition group-hover:scale-110', tone)}>
              <Icon size={20} />
            </span>
            <span className="w-full truncate text-[11px] font-semibold text-white/75">{label}</span>
          </Link>
        ))}
      </section>

      {/* Annonces des coachs / de l'équipe */}
      <AnnouncementStrip announcements={data.announcements.slice(0, 4)} />

      {/* Mot du coach */}
      <Card className="flex items-start gap-3">
        <Avatar name={tip.coach} size="md" online />
        <div className="min-w-0 flex-1">
          <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
            {tip.coach}
            <span className="rounded-full bg-fit/15 px-2 py-0.5 text-[10px] font-semibold text-fit">Conseil du jour</span>
          </p>
          <p className="mt-1 text-sm leading-relaxed text-white/70">« {tip.text} »</p>
          <Link to="/coach" className="mt-2 inline-flex items-center gap-1 text-xs font-semibold text-fit">
            <MessageCircle size={13} /> Poser une question à ton coach
          </Link>
        </div>
      </Card>

      {/* Repas du jour */}
      {todayMeals.length > 0 && (
        <section>
          <SectionHead icon={Apple} title="Au menu aujourd’hui" to="/nutrition" linkLabel="Mon alimentation" />
          <div className="grid gap-3 sm:grid-cols-2">
            {todayMeals.slice(0, 2).map((meal) => (
              <MealCard key={meal.id} meal={meal} />
            ))}
          </div>
        </section>
      )}

      {/* Lives à venir */}
      {upcomingLives.length > 0 && (
        <section>
          <SectionHead icon={Radio} title="Lives à venir" to="/lives" linkLabel="Voir les lives" />
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingLives.map((live) => (
              <LiveCard key={live.id} live={live} onClick={() => navigate(`/lives/${live.id}`)} />
            ))}
          </div>
        </section>
      )}

      {/* Prochains événements */}
      {upcomingEvents.length > 0 && (
        <section>
          <SectionHead icon={CalendarDays} title="Prochains événements" to="/events" linkLabel="Voir l’agenda" />
          <div className="grid gap-3 sm:grid-cols-2">
            {upcomingEvents.slice(0, 2).map((event) => (
              <Link key={event.id} to="/events" className="block">
                <EventCard event={event} compact />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Communauté */}
      <Link to="/community" className="block">
        <section className="group relative overflow-hidden rounded-3xl border border-white/5">
          <img
            src={heroImages.community}
            alt=""
            loading="lazy"
            className="absolute inset-0 h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-ink-900 via-ink-900/80 to-ink-900/30" />
          <div className="relative flex items-center gap-4 p-5">
            <div className="min-w-0 flex-1">
              <AvatarStack names={['Amina', 'Koffi', 'Fatou', 'Moussa', 'Yawa']} max={5} />
              <p className="mt-3 text-base font-bold text-white">Tu n’es pas seul·e dans l’aventure</p>
              <p className="mt-0.5 text-xs text-white/65">Amina vient de terminer sa 4e semaine, Fatou a couru son premier 10 km. Viens les encourager.</p>
            </div>
            <ChevronRight size={20} className="shrink-0 text-white/60" />
          </div>
        </section>
      </Link>
    </div>
  )
}
