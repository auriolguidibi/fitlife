import { useMemo, useState } from 'react'
import {
  Activity as ActivityIcon,
  AlertTriangle,
  Flame,
  Footprints,
  Gauge,
  MapPin,
  Navigation,
  Pause,
  Play,
  Square,
  Timer,
  TrendingUp,
  X,
} from 'lucide-react'
import type { Activity, ActivityType } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useActivity } from '@/context/ActivityContext'
import { useSteps } from '@/context/StepsContext'
import { Badge, Card, Modal, ProgressRing, Spinner, StatCard, Tabs } from '@/components/ui'
import { cn } from '@/utils/cn'
import { AreaChartCard } from '@/components/ui/Chart'
import { RouteMap } from '@/components/domain/RouteMap'
import { activityTypeLabels } from '@/utils/labels'
import { formatClock, formatKm, formatNumber, relativeTime } from '@/utils/format'
import { distanceFromSteps } from '@/utils/fitness'
import { todayKey, daysAgoKey } from '@/utils/id'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { activityTypeIcons, TypeIcon } from '@/components/ui'
import { CheckCircle2 } from 'lucide-react'

type Tab = 'podometer' | 'gps' | 'history'

const STEP_GOAL = 10000


export function ActivityPage() {
  const [tab, setTab] = useState<Tab>('podometer')

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Bouge, ça compte"
        title="Podomètre & Activité"
        subtitle="Compte tes pas ou lance une session GPS et alimente le classement."
        icon={<Footprints size={22} />}
        image={pageHeroes.activity}
      />

      <Tabs
        value={tab}
        onChange={setTab}
        tabs={[
          { value: 'podometer', label: 'Podomètre', icon: <Footprints size={15} /> },
          { value: 'gps', label: 'Session GPS', icon: <MapPin size={15} /> },
          { value: 'history', label: 'Historique', icon: <TrendingUp size={15} /> },
        ]}
      />

      {tab === 'podometer' && <PodometerView />}
      {tab === 'gps' && <GpsView />}
      {tab === 'history' && <HistoryView />}
    </div>
  )
}

/** Tuile de mesure colorée (podomètre et GPS). */
function Metric({
  icon: Icon,
  label,
  value,
  unit,
  tone,
}: {
  icon: typeof Footprints
  label: string
  value: string
  unit?: string
  tone: 'lime' | 'sky' | 'orange' | 'violet'
}) {
  const tones = {
    lime: ['from-lime-400/20', 'text-lime-300'],
    sky: ['from-sky-400/20', 'text-sky-300'],
    orange: ['from-orange-400/20', 'text-orange-300'],
    violet: ['from-violet-400/20', 'text-violet-300'],
  }
  return (
    <div className={cn('relative overflow-hidden rounded-3xl border border-white/[0.07] bg-gradient-to-br to-ink-800 p-4', tones[tone][0])}>
      <span className={cn('grid h-9 w-9 place-items-center rounded-2xl bg-ink-900/40', tones[tone][1])}>
        <Icon size={17} />
      </span>
      <p className="mt-3 text-[11px] font-semibold uppercase tracking-wider text-white/45">{label}</p>
      <p className="mt-0.5 flex items-end gap-1">
        <span className="font-display text-2xl font-extrabold leading-none tabular-nums text-white">{value}</span>
        {unit && <span className="mb-0.5 text-xs text-white/50">{unit}</span>}
      </p>
    </div>
  )
}

function stepMessage(pct: number): string {
  if (pct >= 100) return 'Objectif atteint, bravo ! Chaque pas en plus est un bonus.'
  if (pct >= 75) return 'Dernière ligne droite, tu y es presque !'
  if (pct >= 50) return 'Plus de la moitié : garde ce rythme.'
  if (pct >= 25) return 'Beau début, une petite marche et ça décolle.'
  return 'Chaque pas compte : lance-toi !'
}

function PodometerView() {
  const today = todayKey()
  const { todaySteps, source, problem, enable } = useSteps()
  const { data: raw, loading } = useAsync(async () => {
    const [steps, activities] = await Promise.all([api.getSteps(today), api.getActivities()])
    const week = await Promise.all(
      Array.from({ length: 7 }, (_, i) => api.getSteps(daysAgoKey(6 - i))),
    )
    return { steps, activities, week }
  }, [today])

  if (loading || !raw) return <Spinner label="Lecture de tes pas…" />
  // Pas d'aujourd'hui : valeur en direct du capteur du téléphone.
  const live = Math.max(raw.steps, todaySteps)
  const data = { ...raw, steps: live, week: [...raw.week.slice(0, 6), Math.max(raw.week[6] ?? 0, live)] }

  const distance = distanceFromSteps(data.steps)
  const calories = Math.round(data.steps * 0.04)
  const seconds = Math.round((data.steps / 100) * 60)
  const pct = Math.round((data.steps / STEP_GOAL) * 100)
  const speed = seconds > 0 ? distance / (seconds / 3600) : 0
  const remaining = Math.max(0, STEP_GOAL - data.steps)

  const dayLetters = ['D', 'L', 'M', 'M', 'J', 'V', 'S']
  const chartData = data.week.map((v, i) => ({
    label: dayLetters[new Date(Date.now() - (6 - i) * 864e5).getDay()],
    pas: v,
  }))
  const best = Math.max(...data.week)
  const avg = Math.round(data.week.reduce((t, v) => t + v, 0) / 7)
  const goalDays = data.week.filter((v) => v >= STEP_GOAL).length
  const milestones = [2500, 5000, 7500, 10000]

  return (
    <div className="space-y-5">
      <Card variant="gradient" className="relative overflow-hidden">
        <div className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-fit/20 blur-3xl" />
        <div className="relative flex flex-col items-center gap-5 sm:flex-row sm:gap-8">
          <ProgressRing value={Math.min(data.steps, STEP_GOAL)} max={STEP_GOAL} size={196} stroke={16}>
            <div className="text-center">
              <Footprints size={20} className="mx-auto text-fit" />
              <p className="mt-1 font-display text-4xl font-extrabold tabular-nums text-white">{formatNumber(data.steps)}</p>
              <p className="text-xs text-white/50">pas aujourd’hui</p>
              <p className="mt-1 text-sm font-bold text-fit">{pct}%</p>
            </div>
          </ProgressRing>
          <div className="w-full flex-1 space-y-4 text-center sm:text-left">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-fit">Objectif {formatNumber(STEP_GOAL)} pas</p>
              <p className="mt-1 font-display text-xl font-bold text-white">
                {remaining > 0 ? `Encore ${formatNumber(remaining)} pas` : 'Objectif du jour atteint !'}
              </p>
              <p className="mt-1 text-sm text-white/60">{stepMessage(pct)}</p>
            </div>
            <div className="flex gap-2">
              {milestones.map((m) => {
                const reached = data.steps >= m
                return (
                  <div key={m} className="flex-1">
                    <div className={cn('h-2 rounded-full', reached ? 'bg-gradient-to-r from-lime-300 to-fit' : 'bg-white/10')} />
                    <p className={cn('mt-1 text-[10px] font-semibold', reached ? 'text-fit' : 'text-white/35')}>{m / 1000}k</p>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={MapPin} label="Distance" value={distance.toFixed(2).replace('.', ',')} unit="km" tone="lime" />
        <Metric icon={Timer} label="Temps actif" value={formatClock(seconds).slice(0, 5)} unit="h" tone="sky" />
        <Metric icon={Flame} label="Calories" value={formatNumber(calories)} unit="kcal" tone="orange" />
        <Metric icon={Gauge} label="Vitesse moy." value={speed.toFixed(1).replace('.', ',')} unit="km/h" tone="violet" />
      </div>

      <Card>
        <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
          <div>
            <h3 className="font-display text-base font-bold text-white">Cette semaine</h3>
            <p className="text-xs text-white/45">7 derniers jours</p>
          </div>
          <div className="flex gap-2 text-center">
            <span className="rounded-2xl bg-white/[0.05] px-3 py-1.5">
              <span className="block text-[10px] text-white/45">Moyenne</span>
              <span className="block text-sm font-bold text-white">{formatNumber(avg)}</span>
            </span>
            <span className="rounded-2xl bg-white/[0.05] px-3 py-1.5">
              <span className="block text-[10px] text-white/45">Record</span>
              <span className="block text-sm font-bold text-white">{formatNumber(best)}</span>
            </span>
            <span className="rounded-2xl bg-fit/15 px-3 py-1.5">
              <span className="block text-[10px] text-fit/80">Objectifs</span>
              <span className="block text-sm font-bold text-fit">{goalDays}/7</span>
            </span>
          </div>
        </div>
        <AreaChartCard data={chartData} dataKey="pas" unit=" pas" />
      </Card>

      {source === 'none' || problem ? (
        <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-4 py-3 text-center text-xs text-amber-100">
          <span className="flex items-start gap-2 text-left">
            <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
            {problem ?? 'Podomètre indisponible sur cet appareil.'}
          </span>
          <button type="button" onClick={() => void enable()} className="rounded-xl bg-amber-400/20 px-3 py-1.5 font-semibold text-amber-200 hover:bg-amber-400/30">
            Réessayer
          </button>
        </div>
      ) : (
        <p className="px-1 text-center text-[11px] text-white/35">
          {source === 'native'
            ? 'Pas comptés par le capteur de ton téléphone, même quand l’application est fermée.'
            : 'Pas comptés par les capteurs de ton téléphone pendant que cette page est ouverte. Installe l’application pour un comptage toute la journée.'}
        </p>
      )}
    </div>
  )
}

function GpsView() {
  const { status, elapsedSeconds, distanceKm, steps, currentSpeedKmh, avgSpeedKmh, calories, route, start, pause, resume, finish, discard, loading, mode, gpsNotice, accuracyM, startError } =
    useActivity()
  const [result, setResult] = useState<{ flagged: boolean; reason?: string; distanceKm: number } | null>(null)

  const started = status === 'active' || status === 'paused'

  const handleFinish = async () => {
    const r = await finish()
    if (r) setResult(r)
  }

  if (!started) {
    const descriptions: Record<ActivityType, string> = {
      walk: 'Balade, marche active',
      run: 'Footing, fractionné',
      bike: 'Vélo, VTT',
      other: 'Randonnée, roller…',
    }
    return (
      <div className="space-y-5">
        <Card variant="gradient" className="relative overflow-hidden">
          <div className="pointer-events-none absolute -left-10 -top-10 h-44 w-44 rounded-full bg-fit/20 blur-3xl" />
          <div className="relative flex items-center gap-4">
            <span className="relative grid h-16 w-16 shrink-0 place-items-center rounded-3xl bg-fit text-white shadow-fit">
              <Navigation size={28} />
              <span className="absolute inset-0 animate-ping rounded-3xl bg-fit/30" />
            </span>
            <div className="min-w-0">
              <h2 className="font-display text-xl font-bold text-white">Session GPS</h2>
              <p className="text-sm text-white/60">Choisis ton activité : parcours, vitesse et pas sont enregistrés en temps réel.</p>
            </div>
          </div>
        </Card>

        <div className="grid grid-cols-2 gap-3">
          {(['walk', 'run', 'bike', 'other'] as ActivityType[]).map((t) => (
            <button
              key={t}
              type="button"
              disabled={loading}
              onClick={() => void start(t)}
              className="group relative flex flex-col items-start gap-3 overflow-hidden rounded-3xl border border-white/[0.08] bg-ink-800 p-4 text-left transition hover:-translate-y-0.5 hover:border-fit/50 disabled:opacity-60"
            >
              <span className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-fit/10 blur-2xl transition group-hover:bg-fit/25" />
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fit/15 text-fit transition group-hover:scale-110 group-hover:bg-fit group-hover:text-white">
                <TypeIcon icon={activityTypeIcons[t]} size={22} />
              </span>
              <span>
                <span className="block font-display text-base font-bold text-white">{activityTypeLabels[t]}</span>
                <span className="block text-xs text-white/45">{descriptions[t]}</span>
              </span>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-fit">
                <Play size={12} fill="currentColor" /> Démarrer
              </span>
            </button>
          ))}
        </div>
        {loading && <p className="text-center text-xs text-white/50">Recherche du signal GPS…</p>}
        {startError && !loading && (
          <p className="flex items-start gap-2 rounded-2xl border border-red-500/25 bg-red-500/10 px-3 py-2 text-xs text-red-200">
            <AlertTriangle size={14} className="mt-0.5 shrink-0" />
            {startError}
          </p>
        )}
        <p className="text-center text-[11px] text-white/40">L’app te demandera l’accès à ta position pour enregistrer ton trajet.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {mode === 'gps' ? (
        <div className="flex items-center gap-2 rounded-2xl border border-fit/25 bg-fit/10 px-3 py-2 text-xs text-white/75">
          <span className="relative flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-fit opacity-70" />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-fit" />
          </span>
          GPS actif{accuracyM !== null && ` · précision ±${accuracyM} m`}
          {gpsNotice && <span className="text-amber-300"> · {gpsNotice}</span>}
        </div>
      ) : (
        <div className="flex items-start gap-2 rounded-2xl border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-300" />
          {gpsNotice ?? 'GPS indisponible : distance calculée avec tes pas.'}
        </div>
      )}
      <RouteMap points={route} live={status === 'active'} />

      <Card variant="gradient" className="relative overflow-hidden text-center">
        <div className="pointer-events-none absolute left-1/2 top-0 h-32 w-64 -translate-x-1/2 rounded-full bg-fit/20 blur-3xl" />
        <p className={cn('relative inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wider', status === 'paused' ? 'bg-amber-400/15 text-amber-300' : 'bg-fit/15 text-fit')}>
          <span className={cn('h-1.5 w-1.5 rounded-full', status === 'paused' ? 'bg-amber-300' : 'animate-pulse bg-fit')} />
          {status === 'paused' ? 'En pause' : 'Enregistrement'}
        </p>
        <p className="relative mt-2 font-display text-5xl font-extrabold tabular-nums tracking-tight text-white sm:text-6xl">{formatClock(elapsedSeconds)}</p>
        <p className="relative mt-1 text-sm text-white/55">
          {distanceKm.toFixed(2).replace('.', ',')} km · {formatNumber(calories)} kcal
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric icon={MapPin} label="Distance" value={distanceKm.toFixed(2).replace('.', ',')} unit="km" tone="lime" />
        <Metric icon={Footprints} label="Pas" value={formatNumber(steps)} tone="sky" />
        <Metric icon={Gauge} label="Vitesse" value={currentSpeedKmh.toFixed(1).replace('.', ',')} unit="km/h" tone="violet" />
        <Metric icon={TrendingUp} label="Moyenne" value={avgSpeedKmh.toFixed(1).replace('.', ',')} unit="km/h" tone="orange" />
      </div>

      <div className="flex items-start justify-center gap-6 py-2">
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => void discard()}
            className="grid h-14 w-14 place-items-center rounded-full border border-white/10 bg-ink-800 text-white/60 transition hover:text-white"
            aria-label="Abandonner la session"
          >
            <X size={20} />
          </button>
          <span className="text-[11px] text-white/45">Abandonner</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          {status === 'active' ? (
            <button
              type="button"
              onClick={pause}
              className="grid h-20 w-20 place-items-center rounded-full bg-amber-400 text-ink-900 shadow-[0_10px_40px_-10px_rgba(251,191,36,0.8)] transition hover:scale-105"
              aria-label="Pause"
            >
              <Pause size={30} fill="currentColor" />
            </button>
          ) : (
            <button
              type="button"
              onClick={resume}
              className="grid h-20 w-20 place-items-center rounded-full bg-fit text-white shadow-fit transition hover:scale-105"
              aria-label="Reprendre"
            >
              <Play size={30} fill="currentColor" className="ml-1" />
            </button>
          )}
          <span className="text-[11px] font-semibold text-white/70">{status === 'active' ? 'Pause' : 'Reprendre'}</span>
        </div>
        <div className="flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={handleFinish}
            className="grid h-14 w-14 place-items-center rounded-full bg-red-500 text-white transition hover:bg-red-600"
            aria-label="Terminer la session"
          >
            <Square size={18} fill="currentColor" />
          </button>
          <span className="text-[11px] text-white/45">Terminer</span>
        </div>
      </div>
      {loading && <p className="text-center text-xs text-white/40">Traitement…</p>}

      <Modal open={!!result} onClose={() => setResult(null)} title="Session terminée !">
        {result && (
          <div className="space-y-4 text-center">
            <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-fit/15 text-fit">
              {result.flagged ? <AlertTriangle size={34} className="text-amber-300" /> : <CheckCircle2 size={36} />}
            </div>
            <div className="grid grid-cols-2 gap-3 text-left">
              <StatCard label="Distance" value={result.distanceKm.toFixed(2).replace('.', ',')} unit="km" icon={<MapPin size={14} />} />
              <StatCard label="Calories" value={formatNumber(calories)} unit="kcal" icon={<ActivityIcon size={14} />} />
            </div>
            {result.flagged ? (
              <Card className="flex items-start gap-2 border-amber-400/30 bg-amber-400/10 text-left">
                <AlertTriangle size={18} className="mt-0.5 shrink-0 text-amber-300" />
                <p className="text-xs text-amber-100">
                  Activité soumise à vérification : {result.reason}. Elle n’est pas encore intégrée au
                  classement.
                </p>
              </Card>
            ) : (
              <p className="text-sm text-fit">
                Activité validée et ajoutée au classement.
              </p>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}

function HistoryView() {
  const { data, loading } = useAsync(() => api.getActivities(), [])
  const [filter, setFilter] = useState<'all' | ActivityType>('all')

  const filtered = useMemo(
    () => (data ?? []).filter((a) => a.status === 'finished' && (filter === 'all' || a.type === filter)),
    [data, filter],
  )

  if (loading || !data) return <Spinner label="Chargement de ton historique…" />

  const totals = filtered.reduce(
    (acc, a) => ({ km: acc.km + a.distanceKm, steps: acc.steps + a.steps, cal: acc.cal + a.calories }),
    { km: 0, steps: 0, cal: 0 },
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatCard label="Distance" value={totals.km.toFixed(1).replace('.', ',')} unit="km" />
        <StatCard label="Pas" value={formatNumber(totals.steps)} />
        <StatCard label="Calories" value={formatNumber(totals.cal)} unit="kcal" />
      </div>

      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'walk', 'run', 'bike', 'other'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium ${
              filter === f ? 'border-fit bg-fit text-white' : 'border-white/10 bg-ink-700 text-white/60'
            }`}
          >
            {f === 'all' ? 'Tout' : activityTypeLabels[f]}
          </button>
        ))}
      </div>

      <div className="space-y-2">
        {filtered.length === 0 && <Card className="text-center text-sm text-white/50">Aucune activité.</Card>}
        {filtered.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </div>
    </div>
  )
}

function ActivityRow({ activity }: { activity: Activity }) {
  const reviewTone =
    activity.reviewStatus === 'validated' ? 'fit' : activity.reviewStatus === 'pending' ? 'amber' : 'red'
  const reviewLabel =
    activity.reviewStatus === 'validated' ? 'Validée' : activity.reviewStatus === 'pending' ? 'Vérification' : 'Rejetée'

  return (
    <Card className="flex items-center gap-3">
      <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fit/15 text-fit">
        <TypeIcon icon={activityTypeIcons[activity.type]} size={20} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-white">{activityTypeLabels[activity.type]}</p>
        <p className="text-xs text-white/50">
          {relativeTime(activity.startedAt)} · {formatClock(activity.durationSeconds)} ·{' '}
          {formatNumber(activity.steps)} pas
        </p>
      </div>
      <div className="text-right">
        <p className="text-sm font-bold text-white">{formatKm(activity.distanceKm)}</p>
        <Badge tone={reviewTone}>{reviewLabel}</Badge>
      </div>
    </Card>
  )
}

export function ActivityListPage() {
  return <ActivityPage />
}
