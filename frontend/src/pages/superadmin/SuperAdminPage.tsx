import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  Crown,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  Printer,
  Search,
  ShieldAlert,
  ShieldCheck,
  Trash2,
  UserCog,
  UserPlus,
  Users,
} from 'lucide-react'
import type { User } from '@/types'
import type { ManagedUser } from '@/services/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Avatar, Badge, Button, Card, EmptyState, Input, Modal, Spinner, StatCard } from '@/components/ui'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { roleLabels } from '@/utils/roles'
import { formatDate, formatNumber, relativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { goalLabels } from '@/utils/labels'
import { dossierHtml, excelFile, printOrShare, saveFile, slug } from '@/utils/dossier'

type Filter = 'all' | 'user' | 'premium' | 'coach' | 'admin'
type Sort = 'recent' | 'name' | 'active'

const roleTone: Record<User['role'], 'gray' | 'blue' | 'purple' | 'red'> = {
  user: 'gray',
  coach: 'blue',
  admin: 'purple',
  superadmin: 'red',
}

const ROLES: User['role'][] = ['user', 'coach', 'admin', 'superadmin']

export function SuperAdminPage() {
  const { user: me } = useAuth()
  const { data, loading, setData } = useAsync(() => api.getAllUsers(), [])
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [sort, setSort] = useState<Sort>('recent')
  const [selected, setSelected] = useState<ManagedUser | null>(null)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [confirmText, setConfirmText] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [toast, setToast] = useState('')

  const list = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (data ?? [])
      .filter((u) => {
        if (filter === 'premium') return u.isPremium
        if (filter === 'admin') return u.role === 'admin' || u.role === 'superadmin'
        if (filter !== 'all') return u.role === filter
        return true
      })
      .filter((u) => !q || `${u.firstName} ${u.lastName} ${u.email} ${u.phone ?? ''}`.toLowerCase().includes(q))
      .sort((a, b) =>
        sort === 'name'
          ? `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`, 'fr')
          : sort === 'active'
            ? b.activities - a.activities
            : b.createdAt.localeCompare(a.createdAt),
      )
  }, [data, query, filter, sort])

  if (loading || !data) return <Spinner label="Chargement des inscrits…" />

  const weekAgo = Date.now() - 7 * 864e5
  const stats = {
    total: data.length,
    newWeek: data.filter((u) => new Date(u.createdAt).getTime() > weekAgo).length,
    premium: data.filter((u) => u.isPremium).length,
    team: data.filter((u) => u.role !== 'user').length,
  }
  const counts: Record<Filter, number> = {
    all: data.length,
    user: data.filter((u) => u.role === 'user').length,
    premium: stats.premium,
    coach: data.filter((u) => u.role === 'coach').length,
    admin: data.filter((u) => u.role === 'admin' || u.role === 'superadmin').length,
  }

  const flash = (m: string) => {
    setToast(m)
    window.setTimeout(() => setToast(''), 3000)
  }
  const replace = (u: ManagedUser) => {
    setData(data.map((x) => (x.id === u.id ? u : x)))
    setSelected(u)
  }
  const run = async (key: string, fn: () => Promise<void>) => {
    setError('')
    setBusy(key)
    try {
      await fn()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action impossible')
    } finally {
      setBusy(null)
    }
  }

  const changeRole = (role: User['role']) =>
    selected &&
    run('role', async () => {
      replace(await api.setUserRole(selected.id, role))
      flash(`Rôle mis à jour : ${roleLabels[role]}`)
    })
  const premium = (days: number) =>
    selected &&
    run(`premium-${days}`, async () => {
      replace(await api.setUserPremium(selected.id, days))
      flash(days > 0 ? `${days} jours de Premium offerts` : 'Premium retiré')
    })
  const remove = () =>
    selected &&
    run('delete', async () => {
      await api.deleteUser(selected.id)
      setData(data.filter((u) => u.id !== selected.id))
      flash(`Compte de ${selected.firstName} supprimé`)
      setConfirmDelete(false)
      setSelected(null)
    })

  const today = new Date().toISOString().slice(0, 10)
  const exportExcel = () =>
    run('excel', async () => {
      await saveFile(`fitlife-inscrits-${today}.xls`, excelFile(list), 'application/vnd.ms-excel')
      flash('Tableau Excel prêt')
    })
  const exportAllDossiers = () =>
    run('dossiers', async () => {
      await printOrShare(`fitlife-dossiers-${today}.html`, await dossierHtml(list))
    })
  const memberDossier = (u: ManagedUser, mode: 'print' | 'save') =>
    run(`dossier-${mode}`, async () => {
      const name = `dossier-${slug(`${u.firstName}-${u.lastName}`)}.html`
      const html = await dossierHtml([u])
      if (mode === 'print') await printOrShare(name, html)
      else await saveFile(name, html, 'text/html')
    })

  const isMe = selected?.id === me?.id

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Contrôle total"
        title="Espace Super admin"
        subtitle="Tous les inscrits, tous les rôles. Tu as aussi accès à l’Espace Gestion et à l’Administration."
        icon={<ShieldAlert size={22} />}
        image={pageHeroes.admin}
      />

      {/* Accès aux autres espaces */}
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          { to: '/gestion', icon: ShieldCheck, title: 'Espace Gestion', text: 'Lives, événements, menus, annonces' },
          { to: '/admin', icon: BarChart3, title: 'Administration', text: 'Statistiques et validation des activités' },
        ].map(({ to, icon: Icon, title, text }) => (
          <Link key={to} to={to} className="surface group flex items-center gap-3 rounded-3xl p-4 transition hover:border-fit/40">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-fit/15 text-fit">
              <Icon size={20} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-white">{title}</span>
              <span className="block text-xs text-white/50">{text}</span>
            </span>
            <ArrowRight size={16} className="text-white/30 transition group-hover:translate-x-1 group-hover:text-fit" />
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Inscrits" value={formatNumber(stats.total)} icon={<Users size={14} />} accent />
        <StatCard label="Nouveaux (7 j)" value={stats.newWeek} icon={<UserPlus size={14} />} />
        <StatCard label="Premium" value={stats.premium} icon={<Crown size={14} />} />
        <StatCard label="Équipe" value={stats.team} icon={<UserCog size={14} />} />
      </div>

      {/* Recherche et filtres */}
      <Card padding="sm" className="space-y-3">
        <div className="flex flex-col gap-2 sm:flex-row">
          <Input
            placeholder="Rechercher un nom, un e-mail, un téléphone…"
            leftIcon={<Search size={16} />}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="flex shrink-0 gap-2">
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as Sort)}
              className="h-12 rounded-2xl border border-white/10 bg-ink-800 px-3 text-sm text-white outline-none focus:border-fit/60"
              aria-label="Trier"
            >
              <option value="recent">Plus récents</option>
              <option value="name">Nom (A→Z)</option>
              <option value="active">Plus actifs</option>
            </select>
            <Button variant="secondary" className="h-12" loading={busy === 'excel'} onClick={exportExcel} leftIcon={<FileSpreadsheet size={16} />}>
              Excel
            </Button>
            <Button variant="secondary" className="h-12" loading={busy === 'dossiers'} onClick={exportAllDossiers} leftIcon={<FolderOpen size={16} />}>
              <span className="hidden sm:inline">Dossiers</span>
            </Button>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'Tous'],
              ['user', 'Membres'],
              ['premium', 'Premium'],
              ['coach', 'Coachs'],
              ['admin', 'Admins'],
            ] as [Filter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              onClick={() => setFilter(value)}
              className={cn(
                'shrink-0 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition',
                filter === value ? 'border-fit bg-fit text-white' : 'border-white/10 text-white/60 hover:text-white',
              )}
            >
              {label} <span className="opacity-60">{counts[value]}</span>
            </button>
          ))}
        </div>
      </Card>

      {/* Liste des inscrits */}
      {list.length === 0 ? (
        <EmptyState icon={<Users size={30} />} title="Aucun inscrit ne correspond" description="Modifie la recherche ou le filtre." />
      ) : (
        <Card padding="none" className="divide-y divide-white/[0.06] overflow-hidden">
          {list.map((u) => (
            <button
              key={u.id}
              type="button"
              onClick={() => {
                setError('')
                setSelected(u)
              }}
              className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-white/[0.03]"
            >
              <Avatar name={`${u.firstName} ${u.lastName}`} src={u.avatarUrl} size="md" />
              <span className="min-w-0 flex-1">
                <span className="flex flex-wrap items-center gap-1.5">
                  <span className="truncate text-sm font-semibold text-white">
                    {u.firstName} {u.lastName}
                  </span>
                  {u.id === me?.id && <span className="text-[10px] text-white/40">(toi)</span>}
                  {u.role !== 'user' && <Badge tone={roleTone[u.role]}>{roleLabels[u.role]}</Badge>}
                  {u.isPremium && (
                    <Badge tone="amber">
                      <Crown size={10} /> Premium
                    </Badge>
                  )}
                </span>
                <span className="block truncate text-xs text-white/45">{u.email}</span>
              </span>
              <span className="hidden shrink-0 text-right text-[11px] text-white/40 sm:block">
                Inscrit {relativeTime(u.createdAt)}
                <span className="block">
                  {u.activities} activité{u.activities > 1 ? 's' : ''} · {String(u.totalKm).replace('.', ',')} km
                </span>
              </span>
            </button>
          ))}
        </Card>
      )}

      {/* Fiche d'un inscrit */}
      <Modal open={!!selected && !confirmDelete} onClose={() => setSelected(null)} title="Fiche membre" size="lg">
        {selected && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <Avatar name={`${selected.firstName} ${selected.lastName}`} src={selected.avatarUrl} size="xl" />
              <div className="min-w-0">
                <p className="font-display text-xl font-bold text-white">
                  {selected.firstName} {selected.lastName}
                </p>
                <p className="truncate text-sm text-white/55">{selected.email}</p>
                {selected.phone && <p className="text-sm text-white/45">{selected.phone}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
              {[
                ['Inscrit le', formatDate(selected.createdAt)],
                ['Activités', String(selected.activities)],
                ['Distance', `${String(selected.totalKm).replace('.', ',')} km`],
                ['Dernière activité', selected.lastActivityAt ? relativeTime(selected.lastActivityAt) : '—'],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-white/[0.04] p-3">
                  <p className="text-[11px] text-white/45">{k}</p>
                  <p className="font-semibold text-white">{v}</p>
                </div>
              ))}
            </div>

            <section className="rounded-2xl border border-fit/25 bg-gradient-to-br from-fit/10 to-transparent p-4">
              <div className="flex items-start gap-3">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-fit/20 text-fit">
                  <FileText size={18} />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">Dossier d’inscription</p>
                  <p className="text-xs text-white/55">
                    Identité, profil physique, objectifs, questionnaire, abonnement et activité, mis en page aux couleurs FitLife.
                  </p>
                </div>
              </div>
              <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                {[
                  ['Né(e) le', selected.birthDate ? formatDate(selected.birthDate) : '—'],
                  ['Taille / poids', selected.height ? `${selected.height} cm · ${String(selected.weight ?? '').replace('.', ',')} kg` : '—'],
                  ['Objectif', selected.goal ? goalLabels[selected.goal] : '—'],
                ].map(([k, v]) => (
                  <div key={k} className="rounded-xl bg-white/[0.04] px-3 py-2">
                    <span className="block text-white/45">{k}</span>
                    <span className="block font-semibold text-white">{v}</span>
                  </div>
                ))}
              </div>
              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                <Button size="sm" loading={busy === 'dossier-print'} onClick={() => memberDossier(selected, 'print')} leftIcon={<Printer size={14} />}>
                  Imprimer / PDF
                </Button>
                <Button size="sm" variant="secondary" loading={busy === 'dossier-save'} onClick={() => memberDossier(selected, 'save')} leftIcon={<Download size={14} />}>
                  Télécharger le dossier
                </Button>
              </div>
            </section>

            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">Rôle</p>
              <div className="grid grid-cols-2 gap-1 rounded-2xl border border-white/10 bg-ink-800 p-1 sm:grid-cols-4">
                {ROLES.map((r) => (
                  <button
                    key={r}
                    type="button"
                    disabled={busy !== null || (isMe && r !== 'superadmin')}
                    onClick={() => r !== selected.role && changeRole(r)}
                    className={cn(
                      'rounded-xl px-2 py-2 text-xs font-semibold transition disabled:opacity-40',
                      selected.role === r ? 'bg-fit text-white' : 'text-white/60 hover:text-white',
                    )}
                  >
                    {roleLabels[r]}
                  </button>
                ))}
              </div>
              <p className="mt-1.5 text-[11px] text-white/35">
                Coach : Espace Gestion · Administrateur : + statistiques et validation · Super admin : + gestion des comptes.
              </p>
            </section>

            <section>
              <p className="mb-2 text-xs font-bold uppercase tracking-wider text-white/40">Abonnement</p>
              <div className="flex flex-wrap items-center gap-2">
                <span className="mr-auto text-sm text-white/70">
                  {selected.isPremium
                    ? `Premium${selected.premiumUntil ? ` jusqu’au ${formatDate(selected.premiumUntil)}` : ''}`
                    : 'Version gratuite'}
                </span>
                <Button size="sm" variant="premium" loading={busy === 'premium-30'} onClick={() => premium(30)} leftIcon={<Crown size={14} />}>
                  Offrir 30 j
                </Button>
                <Button size="sm" variant="secondary" loading={busy === 'premium-365'} onClick={() => premium(365)}>
                  Offrir 1 an
                </Button>
                {selected.isPremium && (
                  <Button size="sm" variant="ghost" className="text-white/60" loading={busy === 'premium-0'} onClick={() => premium(0)}>
                    Retirer
                  </Button>
                )}
              </div>
            </section>

            {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

            <section className="rounded-2xl border border-red-500/25 bg-red-500/[0.05] p-4">
              <p className="text-sm font-bold text-red-300">Zone dangereuse</p>
              <p className="mt-1 text-xs text-white/55">
                La suppression efface le compte et toutes ses données (activités, repas, abonnement, publications). Elle est
                définitive.
              </p>
              <Button
                size="sm"
                variant="danger"
                className="mt-3"
                disabled={isMe}
                onClick={() => {
                  setConfirmText('')
                  setError('')
                  setConfirmDelete(true)
                }}
                leftIcon={<Trash2 size={14} />}
              >
                {isMe ? 'Tu ne peux pas supprimer ton propre compte' : 'Supprimer ce compte'}
              </Button>
            </section>
          </div>
        )}
      </Modal>

      {/* Confirmation de suppression */}
      <Modal open={confirmDelete && !!selected} onClose={() => setConfirmDelete(false)} title="Supprimer définitivement ?" size="sm">
        {selected && (
          <div className="space-y-4">
            <p className="text-sm leading-relaxed text-white/70">
              Le compte de <b className="text-white">{selected.firstName} {selected.lastName}</b> ({selected.email}) et toutes ses
              données seront supprimés. Cette action est irréversible.
            </p>
            <Input
              label="Tape SUPPRIMER pour confirmer"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
            />
            {error && <p className="text-sm text-red-300">{error}</p>}
            <div className="flex justify-end gap-3">
              <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                Annuler
              </Button>
              <Button variant="danger" disabled={confirmText.trim().toUpperCase() !== 'SUPPRIMER'} loading={busy === 'delete'} onClick={remove}>
                Supprimer
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {toast && (
        <div className="fixed inset-x-4 bottom-28 z-50 mx-auto max-w-sm animate-slide-up rounded-2xl border border-fit/30 bg-ink-800/95 px-4 py-3 text-center text-sm font-semibold text-white shadow-card backdrop-blur lg:bottom-8">
          {toast}
        </div>
      )}
    </div>
  )
}
