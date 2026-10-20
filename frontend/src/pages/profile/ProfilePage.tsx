import { DownloadAppButton } from '@/components/domain/DownloadApp'
import { ChangePasswordModal } from '@/components/domain/ChangePasswordModal'
import { PromoRedeem } from '@/components/domain/PromoRedeem'
import { versionLabel } from '@/utils/version'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle,
  Trash2,
  Bell,
  CalendarDays,
  ShieldAlert,
  ShieldCheck,
  Crown,
  Edit3,
  HelpCircle,
  KeyRound,
  LifeBuoy,
  LogOut,
  MapPin,
  Settings,
  Target,
  Weight,
} from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Badge, Button, Card, Input, Modal, Spinner } from '@/components/ui'
import { bmiLabel, calcBmi } from '@/utils/fitness'
import { levelLabels } from '@/utils/labels'
import { formatDate } from '@/utils/format'
import { pageHeroes } from '@/data/images'
import { AvatarPicker } from '@/components/domain/AvatarPicker'
import { isStaff, isSuperAdmin } from '@/utils/roles'

export function ProfilePage() {
  const { user, preferences, logout, updateUser, refresh } = useAuth()
  const navigate = useNavigate()
  const { data: program, loading } = useAsync(() => api.getProgram(), [])
  const { data: badges } = useAsync(() => api.getBadges(), [])
  const [editOpen, setEditOpen] = useState(false)
  const [height, setHeight] = useState('')
  const [weight, setWeight] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  if (loading || !user || !preferences) return <Spinner label="Chargement du profil…" />

  const bmi = calcBmi(user.weight, user.height)
  const earnedCount = badges?.earned.length ?? 0
  const completedCount = program?.weeks.flatMap((w) => w.workouts).filter((x) => x.completed).length ?? 0
  const progressPct = completedCount > 0 && program
    ? Math.round((completedCount / Math.max(1, program.weeks.flatMap((w) => w.workouts).length)) * 100)
    : 0

  const save = async () => {
    const patch: { height?: number; weight?: number } = {}
    const h = Number(height.replace(',', '.'))
    const w = Number(weight.replace(',', '.'))
    if (h >= 100 && h <= 250) patch.height = Math.round(h)
    if (w >= 25 && w <= 300) patch.weight = Math.round(w * 10) / 10
    if (Object.keys(patch).length) await updateUser(patch)
    setEditOpen(false)
    setHeight('')
    setWeight('')
  }

  const sections = [
    ...(isSuperAdmin(user) ? [{ label: 'Espace Super admin', icon: ShieldAlert, to: '/super-admin' }] : []),
    ...(isStaff(user) ? [{ label: 'Espace Gestion', icon: ShieldCheck, to: '/gestion' }] : []),
    { label: 'Mes événements', icon: CalendarDays, to: '/events' },
    { label: 'Mes objectifs', icon: Target, to: '/program' },
    { label: 'Mes informations', icon: Settings, to: '/profile', onClick: () => setEditOpen(true) },
    { label: 'Notifications', icon: Bell, to: '/notifications' },
    { label: 'Paramètres', icon: Settings, to: '/help' },
    { label: 'Mon abonnement', icon: Crown, to: '/premium' },
    { label: 'Aide & support', icon: HelpCircle, to: '/help' },
  ]

  return (
    <div className="space-y-5 animate-fade-in">
      <Card padding="none" className="relative overflow-hidden text-center">
        <div
          className="relative h-36 sm:h-44"
          style={{ maskImage: 'linear-gradient(#000 45%, transparent)', WebkitMaskImage: 'linear-gradient(#000 45%, transparent)' }}
        >
          <img src={pageHeroes.profile} alt="" className="h-full w-full object-cover object-[50%_35%]" />
        </div>
        <div className="relative -mt-12 px-4 pb-5">
        <AvatarPicker />
        <h1 className="mt-3 text-2xl font-extrabold text-white">
          {user.firstName} {user.lastName}
        </h1>
        <div className="mt-1.5 flex items-center justify-center gap-2">
          <Badge tone={preferences.level === 'advanced' ? 'red' : preferences.level === 'intermediate' ? 'amber' : 'fit'}>
            {levelLabels[preferences.level]}
          </Badge>
          {user.isPremium && (
            <Badge tone="amber">
              <Crown size={11} /> Premium
            </Badge>
          )}
        </div>
        <p className="mt-2 text-xs text-white/45">{user.email}</p>
        </div>
        <button
          onClick={() => setEditOpen(true)}
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full border border-white/10 bg-ink-900/60 text-white/80 backdrop-blur-md hover:text-white"
          aria-label="Modifier mes informations"
        >
          <Edit3 size={15} />
        </button>
      </Card>

      <div className="grid grid-cols-3 gap-3">
        <div className="surface rounded-3xl p-4 text-center">
          <p className="font-display text-2xl font-extrabold text-white">{program?.currentWeek ?? 0}</p>
          <p className="text-xs text-white/50">{(program?.currentWeek ?? 0) > 1 ? 'semaines' : 'semaine'}</p>
        </div>
        <div className="surface rounded-3xl p-4 text-center">
          <p className="font-display text-2xl font-extrabold text-white">{progressPct}</p>
          <p className="text-xs text-white/50">% programme</p>
        </div>
        <div className="surface rounded-3xl p-4 text-center">
          <p className="font-display text-2xl font-extrabold text-fit">{completedCount}</p>
          <p className="text-xs text-white/50">{completedCount > 1 ? 'séances réussies' : 'séance réussie'}</p>
        </div>
      </div>

      <Card className="flex items-center gap-4">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-fit/15 text-fit">
          <Weight size={18} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-white/50">IMC ({bmiLabel(bmi)})</p>
          <p className="text-lg font-extrabold text-white">{bmi}</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-fit/15 text-fit">
          <MapPin size={18} />
        </div>
        <div className="flex-1">
          <p className="text-xs text-white/50">Taille / Poids</p>
          <p className="text-lg font-extrabold text-white">
            {user.height} cm · {user.weight} kg
          </p>
        </div>
      </Card>

      <Card className="flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold text-white">{earnedCount} badges débloqués</p>
          <p className="text-xs text-white/50">Continue pour en gagner plus.</p>
        </div>
        <Button variant="secondary" size="sm" onClick={() => navigate('/badges')}>
          Voir
        </Button>
      </Card>

      {/* Code promo : visible pour tout membre (prolonge aussi un Premium en cours). */}
      {!isStaff(user) && <PromoRedeem />}

      <section className="space-y-2">
        {sections.map(({ label, icon: Icon, to, onClick }) => (
          <button
            key={label}
            onClick={onClick ? onClick : () => navigate(to)}
            className="surface group flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:border-fit/30"
          >
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-fit/10 text-fit">
              <Icon size={17} />
            </span>
            <span className="flex-1 text-sm font-semibold text-white">{label}</span>
            <span className="text-white/30 transition group-hover:translate-x-1 group-hover:text-fit">›</span>
          </button>
        ))}
      </section>

      <DownloadAppButton variant="card" />

      <Card variant="glass" className="text-center text-xs text-white/40">
        Membre depuis le {formatDate(user.createdAt)}
        <span className="mt-1 block text-[10px] text-white/25">{versionLabel()}</span>
      </Card>

      <button
        type="button"
        onClick={() => setPasswordOpen(true)}
        className="surface group flex w-full items-center gap-3 rounded-2xl px-4 py-3.5 text-left transition hover:border-fit/30"
      >
        <span className="grid h-9 w-9 place-items-center rounded-xl bg-fit/10 text-fit">
          <KeyRound size={17} />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-white">Changer mon mot de passe</span>
          <span className="block text-xs text-white/45">Sécurise ton compte avec un nouveau mot de passe</span>
        </span>
        <span className="text-white/30 transition group-hover:translate-x-1 group-hover:text-fit">›</span>
      </button>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />

      <Button variant="danger" fullWidth onClick={logout} leftIcon={<LogOut size={16} />}>
        Se déconnecter
      </Button>

      <button
        type="button"
        onClick={() => {
          setDeleteText('')
          setDeleteError('')
          setDeleteOpen(true)
        }}
        className="flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/20 px-4 py-3 text-sm font-semibold text-red-300/80 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-300"
      >
        <Trash2 size={15} /> Supprimer mon compte
      </button>

      <Modal open={deleteOpen} onClose={() => !deleting && setDeleteOpen(false)} title="Supprimer mon compte" size="sm">
        <div className="space-y-3">
          <div className="flex items-start gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-3">
            <AlertTriangle size={18} className="mt-0.5 shrink-0 text-red-300" />
            <p className="text-sm text-white/75">
              Ton compte et toutes tes données (programme, repas, activités, messages, abonnement) seront supprimés
              définitivement. Cette action est irréversible.
            </p>
          </div>
          <Input
            label="Pour confirmer, écris SUPPRIMER"
            value={deleteText}
            onChange={(e) => setDeleteText(e.target.value)}
            placeholder="SUPPRIMER"
            autoCapitalize="characters"
          />
          {deleteError && <p className="text-sm text-red-300">{deleteError}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteOpen(false)} disabled={deleting}>
            Annuler
          </Button>
          <Button
            variant="danger"
            loading={deleting}
            disabled={deleteText.trim().toUpperCase() !== 'SUPPRIMER'}
            leftIcon={<Trash2 size={15} />}
            onClick={async () => {
              setDeleting(true)
              setDeleteError('')
              try {
                await api.deleteMyAccount()
                await refresh()
                navigate('/login', { replace: true })
              } catch (err) {
                setDeleteError(err instanceof Error ? err.message : 'Suppression impossible')
                setDeleting(false)
              }
            }}
          >
            Supprimer définitivement
          </Button>
        </div>
      </Modal>

      <Modal open={editOpen} onClose={() => setEditOpen(false)} title="Mes informations">
        <div className="space-y-3">
          <Input label="Taille (cm)" inputMode="numeric" value={height} onChange={(e) => setHeight(e.target.value)} placeholder={String(user.height)} />
          <Input label="Poids (kg)" inputMode="decimal" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder={String(user.weight)} />
          <Input label="Email" value={user.email} disabled hint="L’email ne peut pas être modifié ici." />
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setEditOpen(false)}>Annuler</Button>
          <Button onClick={save}>Enregistrer</Button>
        </div>
      </Modal>

      <div className="flex items-center gap-2 pb-2 text-xs text-white/30">
        <LifeBuoy size={13} /> Besoin d’aide ? Consulte la page « Aide & support ».
      </div>
    </div>
  )
}