import { useState } from 'react'
import { BarChart3, Check, Crown, Shield, Users, X } from 'lucide-react'
import type { Activity } from '@/types'
import type { AdminStats, AdminUserRow } from '@/services/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Badge, Button, Card, Spinner, StatCard, Tabs } from '@/components/ui'
import { activityTypeLabels, levelLabels } from '@/utils/labels'
import { formatDate, formatKm, formatCurrency, formatNumber } from '@/utils/format'
import { cn } from '@/utils/cn'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { AlertTriangle } from 'lucide-react'
import { roleLabels } from '@/utils/roles'

type Section = 'overview' | 'users' | 'activities' | 'lives'

export function AdminPage() {
  const [section, setSection] = useState<Section>('overview')
  const { data: stats } = useAsync(() => api.getAdminStats(), [])
  const { data: users, loading } = useAsync(() => api.getAdminUsers(), [])

  if (!stats) return <Spinner label="Chargement des statistiques…" />

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Back-office"
        title="Administration"
        subtitle="Pilote FitLife : utilisateurs, lives, activités et revenus."
        icon={<Shield size={22} />}
        image={pageHeroes.admin}
      />

      <Tabs
        value={section}
        onChange={setSection}
        tabs={[
          { value: 'overview', label: 'Vue générale', icon: <BarChart3 size={15} /> },
          { value: 'users', label: 'Utilisateurs', count: stats.users },
          { value: 'activities', label: 'Activités à valider' },
          { value: 'lives', label: 'Lives' },
        ]}
      />

      {section === 'overview' && <Overview stats={stats} />}
      {section === 'users' && <UsersSection users={users} loading={loading} />}
      {section === 'activities' && <ActivitiesSection />}
      {section === 'lives' && <LivesSection />}
    </div>
  )
}

function Overview({ stats }: { stats: AdminStats }) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatCard label="Utilisateurs" value={stats.users} icon={<Users size={14} />} />
        <StatCard label="Premium" value={stats.premiumUsers} icon={<Crown size={14} className="text-amber-300" />} />
        <StatCard label="Revenus (M)" value={(stats.revenue / 1e6).toFixed(1).replace('.', ',')} unit="M FCFA" icon={<BarChart3 size={14} />} />
        <StatCard label="Lives" value={stats.lives} />
        <StatCard label="Séances" value={stats.sessions} />
        <StatCard label="Km parcourus" value={formatNumber(Math.round(stats.totalKm))} unit="km" />
        <StatCard label="Actifs" value={stats.activeUsers} className="col-span-2 sm:col-span-1" />
      </div>
      <Card variant="glass" className="text-sm text-white/60">
        <p className="font-semibold text-white">Revenus mensuels estimés</p>
        <p className="mt-1 text-2xl font-extrabold text-fit">{formatCurrency(stats.revenue)} / mois</p>
        <p className="mt-1 text-xs text-white/40">
          Calculés sur {stats.premiumUsers} abonnés Premium (4 000 FCFA/mois). Démo : valeurs
          recalculées depuis les données locales.
        </p>
      </Card>
    </div>
  )
}

function UsersSection({ users, loading }: { users: AdminUserRow[] | null; loading: boolean }) {
  return (
    <Card padding="none" className="overflow-hidden">
      {loading || !users ? (
        <div className="p-6"><Spinner /></div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <thead>
              <tr className="border-b border-white/5 text-xs text-white/40">
                <th className="px-4 py-3">Utilisateur</th>
                <th className="px-4 py-3">Email</th>
                <th className="px-4 py-3">Rôle</th>
                <th className="px-4 py-3">Premium</th>
                <th className="px-4 py-3">Inscription</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5 text-white/80">
                  <td className="px-4 py-3 font-semibold text-white">{u.name}</td>
                  <td className="px-4 py-3 text-white/50">{u.email}</td>
                  <td className="px-4 py-3">
                    <Badge tone={u.role === 'superadmin' ? 'red' : u.role === 'admin' ? 'purple' : u.role === 'coach' ? 'blue' : 'gray'}>{roleLabels[u.role]}</Badge>
                  </td>
                  <td className="px-4 py-3">{u.isPremium ? <Crown size={16} className="text-amber-300" /> : '—'}</td>
                  <td className="px-4 py-3 text-white/50">{formatDate(u.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  )
}

function ActivitiesSection() {
  const { data, loading, reload } = useAsync(() => api.getPendingActivities(), [])
  const [busy, setBusy] = useState<string | null>(null)

  if (loading || !data) return <Spinner label="Chargement des activités…" />
  const pending = data.filter((a) => a.reviewStatus === 'pending')

  const review = async (id: string, decision: 'validated' | 'rejected') => {
    setBusy(id)
    try {
      await api.reviewActivity(id, decision)
      reload()
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="space-y-3">
      {pending.length === 0 && (
        <Card className="text-center text-sm text-white/50">Aucune activité en attente de validation.</Card>
      )}
      {pending.map((a) => (
        <PendingRow key={a.id} activity={a} busy={busy === a.id} onReview={review} />
      ))}
    </div>
  )
}

function PendingRow({
  activity,
  busy,
  onReview,
}: {
  activity: Activity
  busy: boolean
  onReview: (id: string, decision: 'validated' | 'rejected') => void
}) {
  const suspicious = activity.reviewStatus === 'pending'
  return (
    <Card className={cn('space-y-3', suspicious && 'border-amber-400/25 bg-amber-400/5')}>
      <div className="flex items-center justify-between">
        <div>
          <p className="flex items-center gap-2 text-sm font-bold text-white">
            {activity.userName} <Badge tone="gray">{activityTypeLabels[activity.type]}</Badge>
          </p>
          <p className="text-xs text-white/50">{formatDate(activity.startedAt)}</p>
        </div>
        <p className="text-sm font-extrabold text-white">{formatKm(activity.distanceKm)}</p>
      </div>
      <div className="grid grid-cols-3 gap-2 text-xs text-white/60">
        <span>Vitesse moy : {activity.avgSpeedKmh.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h</span>
        <span>Vitesse max : {activity.maxSpeedKmh.toLocaleString('fr-FR', { maximumFractionDigits: 1 })} km/h</span>
        <span>{formatNumber(activity.steps)} pas</span>
      </div>
      {activity.reviewReason && (
        <p className="flex items-center gap-2 rounded-xl bg-amber-400/10 px-3 py-2 text-xs text-amber-200">
          <AlertTriangle size={14} className="shrink-0" /> {activity.reviewReason}
        </p>
      )}
      <div className="grid grid-cols-2 gap-3">
        <Button variant="danger" size="sm" onClick={() => onReview(activity.id, 'rejected')} loading={busy} leftIcon={<X size={14} />}>
          Rejeter
        </Button>
        <Button variant="primary" size="sm" onClick={() => onReview(activity.id, 'validated')} loading={busy} leftIcon={<Check size={14} />}>
          Valider
        </Button>
      </div>
    </Card>
  )
}

function LivesSection() {
  const { data, loading } = useAsync(() => api.getLives(), [])

  if (loading || !data) return <Spinner label="Chargement des lives…" />

  return (
    <div className="space-y-3">
      {data.map((live) => (
        <Card key={live.id} className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-bold text-white">{live.title}</p>
            <p className="text-xs text-white/50">
              {live.coachName} · {levelLabels[live.level]} · {formatDate(live.scheduledAt)}
            </p>
          </div>
          <Badge tone={live.status === 'live' ? 'red' : live.status === 'scheduled' ? 'fit' : 'gray'}>
            {live.status === 'live' ? 'En direct' : live.status === 'scheduled' ? 'Programmé' : 'Terminé'}
          </Badge>
        </Card>
      ))}
    </div>
  )
}