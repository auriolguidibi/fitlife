import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import {
  ArrowRight,
  CalendarClock,
  Check,
  ChevronDown,
  Crown,
  Dumbbell,
  FileText,
  LineChart,
  MessageCircle,
  Minus,
  Printer,
  Radio,
  RotateCcw,
  Salad,
  ShieldCheck,
  Trophy,
} from 'lucide-react'
import type { Payment } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Badge, Button, Card, Modal, Spinner } from '@/components/ui'
import { SectionTitle } from '@/components/layout/PageHero'
import { LOGO_MARK } from '@/components/layout/Logo'
import { CheckoutModal, MethodMark } from '@/components/domain/CheckoutModal'
import { PromoRedeem } from '@/components/domain/PromoRedeem'
import { offerComparison, paymentMethodById, planById } from '@/data/plans'
import type { Access } from '@/data/plans'
import { pageHeroes } from '@/data/images'
import { formatCurrency, formatDate } from '@/utils/format'
import { cn } from '@/utils/cn'
import { isStaff, roleLabels } from '@/utils/roles'

const statusLabels: Record<Payment['status'], { label: string; tone: 'fit' | 'amber' | 'red' }> = {
  succeeded: { label: 'Payé', tone: 'fit' },
  pending: { label: 'En attente', tone: 'amber' },
  failed: { label: 'Échoué', tone: 'red' },
}

const benefits: { icon: LucideIcon; title: string; text: string }[] = [
  { icon: Dumbbell, title: 'Programme sur mesure', text: 'Selon ton objectif, ton niveau et ton temps' },
  { icon: Radio, title: 'Lives Premium', text: 'Et tes questions aux coachs en direct' },
  { icon: Salad, title: 'Nutrition complète', text: 'Menus de la semaine et liste de courses' },
  { icon: MessageCircle, title: 'Coach IA', text: 'Conseils fitness et nutrition à toute heure' },
  { icon: Trophy, title: 'Défis & classements', text: 'Badges, récompenses et classement km' },
  { icon: LineChart, title: 'Statistiques', text: 'Historique complet et graphiques' },
]

const groups: { title: string; features: string[] }[] = [
  { title: 'Entraînement', features: ['Exercices', 'Vidéos d’entraînement', 'Programmes personnalisés', 'Suivi des séances'] },
  { title: 'Coaching', features: ['Lives fitness', 'Chat avec le coach', 'Coach IA'] },
  {
    title: 'Nutrition',
    features: ['Suivi de l’alimentation', 'Programme alimentaire', 'Menu hebdomadaire', 'Suivi des repas', 'Hydratation', 'Apports nutritionnels', 'Liste de courses', 'Suggestions de repas'],
  },
  {
    title: 'Progression & communauté',
    features: ['Suivi de progression', 'Poids & mensurations', 'Défis communautaires', 'Classements & badges', 'Podomètre & activités', 'Classement kilométrique', 'Historique complet', 'Statistiques détaillées'],
  },
]

function AccessIcon({ access }: { access: Access }) {
  if (access === 'yes') return <span className="grid h-6 w-6 place-items-center rounded-full bg-fit/15 text-fit"><Check size={13} strokeWidth={3} /></span>
  if (access === 'limited') return <span className="grid h-6 w-6 place-items-center rounded-full bg-amber-400/15 text-[10px] font-extrabold text-amber-300">½</span>
  return <span className="grid h-6 w-6 place-items-center rounded-full bg-white/[0.06] text-white/30"><Minus size={13} strokeWidth={3} /></span>
}

function Receipt({ payment, name, email }: { payment: Payment; name: string; email: string }) {
  const plan = planById(payment.plan)
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="flex items-center gap-2">
          <img src={LOGO_MARK} alt="" className="h-8 w-8" />
          <span className="font-display text-xl font-extrabold italic text-white">
            Fit<span className="text-fit">Life</span>
          </span>
        </span>
        <Badge tone={statusLabels[payment.status].tone}>{statusLabels[payment.status].label}</Badge>
      </div>
      <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm">
        {[
          ['Reçu n°', payment.reference],
          ['Date', formatDate(payment.paidAt ?? payment.createdAt)],
          ['Client', `${name} · ${email}`],
          ['Offre', `${plan.name} ${payment.billing === 'monthly' ? 'mensuel' : 'annuel'}`],
          ['Moyen de paiement', `${paymentMethodById(payment.method).label}${payment.phoneMasked ? ` (${payment.phoneMasked})` : ''}`],
        ].map(([k, v]) => (
          <div key={k} className="flex justify-between gap-4 py-1.5">
            <span className="text-white/50">{k}</span>
            <span className="text-right font-medium text-white">{v}</span>
          </div>
        ))}
        <div className="mt-2 flex justify-between border-t border-white/10 pt-3">
          <span className="font-semibold text-white">Total</span>
          <span className="font-display text-lg font-extrabold text-white">{formatCurrency(payment.amount)}</span>
        </div>
      </div>
    </div>
  )
}

export function PremiumPage() {
  const { user, refresh } = useAuth()
  const { data, loading, setData, reload } = useAsync(async () => {
    const [sub, payments] = await Promise.all([api.getSubscription(), api.getPayments()])
    return { sub, payments }
  }, [])
  const [billing, setBilling] = useState<'monthly' | 'yearly'>('yearly')
  const [checkout, setCheckout] = useState(false)
  const [checkoutKey, setCheckoutKey] = useState(0)
  const [receipt, setReceipt] = useState<Payment | null>(null)
  const [confirmCancel, setConfirmCancel] = useState(false)
  const [busy, setBusy] = useState(false)
  const [openGroup, setOpenGroup] = useState<string | null>('Entraînement')

  if (loading || !data || !user) return <Spinner label="Chargement de ton abonnement…" />

  const { sub, payments } = data
  const plan = planById('premium')
  const now = Date.now()
  const running = !!sub && sub.status !== 'expired' && new Date(sub.renewsAt).getTime() > now
  const staffAccess = isStaff(user)

  const syncData = async () => {
    const [freshSub, freshPayments] = await Promise.all([api.getSubscription(), api.getPayments()])
    setData({ sub: freshSub, payments: freshPayments })
  }
  const openCheckout = () => {
    setCheckoutKey((k) => k + 1)
    setCheckout(true)
  }
  const cancel = async () => {
    setBusy(true)
    try {
      await api.cancelSubscription()
      setConfirmCancel(false)
      await refresh()
      await syncData()
    } finally {
      setBusy(false)
    }
  }
  const resume = async () => {
    setBusy(true)
    try {
      await api.resumeSubscription()
      await syncData()
    } finally {
      setBusy(false)
    }
  }

  // Période en cours
  let daysLeft = 0
  let periodPct = 0
  if (sub && running) {
    const end = new Date(sub.renewsAt).getTime()
    const length = (sub.billing === 'monthly' ? 30 : 365) * 864e5
    daysLeft = Math.max(0, Math.ceil((end - now) / 864e5))
    periodPct = Math.min(100, Math.max(0, ((end - now) / length) * 100))
  }
  const ring = 2 * Math.PI * 34
  const yearlySaving = plan.priceMonthly * 12 - plan.priceYearly

  return (
    <div className="space-y-7">
      {/* ---------- En-tête ---------- */}
      <header className="relative isolate overflow-hidden rounded-[2rem] border border-amber-400/20 px-5 py-8 text-center sm:py-10">
        <img src={pageHeroes.premium} alt="" className="absolute inset-0 -z-10 h-full w-full object-cover opacity-40" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-ink-900/60 via-ink-900/85 to-ink-900" />
        <div className="absolute left-1/2 top-0 -z-10 h-48 w-[28rem] -translate-x-1/2 rounded-full bg-amber-400/20 blur-3xl" />
        <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-amber-200 to-amber-500 text-ink-900 shadow-[0_10px_40px_-8px_rgba(251,191,36,0.7)]">
          <Crown size={26} />
        </span>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-[0.25em] text-amber-300">FitLife Premium</p>
        <h1 className="mx-auto mt-2 max-w-md text-3xl font-extrabold leading-tight text-white sm:text-4xl">
          {running ? (
            <>
              Merci de faire partie de <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">l’élite</span>
            </>
          ) : (
            <>
              Un vrai coach, <span className="bg-gradient-to-r from-amber-200 to-amber-400 bg-clip-text text-transparent">dans ta poche</span>
            </>
          )}
        </h1>
        <p className="mx-auto mt-2 max-w-md text-sm text-white/60">
          Entraînement, nutrition, coaching, activité, défis et progression : un accompagnement complet.
        </p>
      </header>

      {/* ---------- Carte de membre ---------- */}
      {running && sub && (
        <section className="space-y-3">
          <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-amber-300/30 bg-gradient-to-br from-[#2a2410] via-[#151208] to-[#0b0a05] p-5 shadow-[0_30px_60px_-30px_rgba(251,191,36,0.45)]">
            <div className="absolute -right-16 -top-20 -z-10 h-56 w-56 rounded-full bg-amber-400/20 blur-3xl" />
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,transparent_40%,rgba(255,255,255,0.06)_50%,transparent_60%)]" />
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2">
                <img src={LOGO_MARK} alt="" className="h-9 w-9" />
                <span className="font-display text-lg font-extrabold italic text-white">
                  Fit<span className="text-amber-300">Life</span>
                </span>
              </div>
              <span className="rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-[10px] font-extrabold tracking-[0.2em] text-amber-200">
                PREMIUM
              </span>
            </div>

            <div className="mt-8 flex items-end justify-between gap-4">
              <div className="min-w-0">
                <p className="text-[10px] uppercase tracking-[0.2em] text-amber-100/50">Membre</p>
                <p className="truncate font-display text-xl font-bold text-white">
                  {user.firstName} {user.lastName}
                </p>
                <p className="mt-3 text-[10px] uppercase tracking-[0.2em] text-amber-100/50">
                  {sub.status === 'active' ? 'Prochain renouvellement' : 'Valable jusqu’au'}
                </p>
                <p className="font-semibold text-amber-100">{formatDate(sub.renewsAt)}</p>
              </div>
              <div className="relative grid h-20 w-20 shrink-0 place-items-center">
                <svg viewBox="0 0 80 80" className="absolute inset-0 -rotate-90">
                  <circle cx="40" cy="40" r="34" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="6" />
                  <circle
                    cx="40"
                    cy="40"
                    r="34"
                    fill="none"
                    stroke="url(#gold)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    strokeDasharray={ring}
                    strokeDashoffset={ring * (1 - periodPct / 100)}
                  />
                  <defs>
                    <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#FDE68A" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                </svg>
                <div className="text-center">
                  <p className="font-display text-xl font-extrabold leading-none text-white">{daysLeft}</p>
                  <p className="text-[9px] font-semibold uppercase text-amber-100/60">jours</p>
                </div>
              </div>
            </div>
          </div>

          <div className="surface flex flex-wrap items-center gap-3 rounded-3xl p-3.5">
            {sub.method && <MethodMark method={sub.method} size="sm" />}
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {plan.name} {sub.billing === 'monthly' ? 'mensuel' : 'annuel'} ·{' '}
                {formatCurrency(sub.billing === 'monthly' ? plan.priceMonthly : plan.priceYearly)}
              </p>
              <p className="text-xs text-white/45">
                {sub.status === 'active'
                  ? `Renouvellement automatique${sub.method ? ` · ${paymentMethodById(sub.method).label}` : ''}`
                  : 'Résilié : aucun nouveau prélèvement'}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="premium" onClick={openCheckout} leftIcon={<Crown size={14} />}>
                Prolonger
              </Button>
              {sub.status === 'active' ? (
                <Button size="sm" variant="ghost" className="text-white/55" onClick={() => setConfirmCancel(true)}>
                  Résilier
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={resume} loading={busy} leftIcon={<RotateCcw size={14} />}>
                  Réactiver
                </Button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* ---------- Offre ---------- */}
      {!running && (
        <section className="space-y-4">
          {staffAccess && (
            <Card variant="glass" className="flex items-center gap-3 text-sm text-white/70">
              <ShieldCheck size={18} className="shrink-0 text-fit" />
              En tant que {roleLabels[user.role].toLowerCase()}, tu as déjà accès à toutes les fonctionnalités.
            </Card>
          )}
          {sub?.status === 'expired' && (
            <Card className="flex items-center gap-3 border-amber-400/25 bg-amber-400/[0.06] text-sm text-white/75">
              <CalendarClock size={18} className="shrink-0 text-amber-300" />
              Ton abonnement a expiré le {formatDate(sub.renewsAt)}. Renouvelle-le pour retrouver tous tes avantages.
            </Card>
          )}

          <div className="mx-auto grid max-w-sm grid-cols-2 rounded-full border border-white/10 bg-ink-800 p-1 text-sm font-semibold">
            {(['monthly', 'yearly'] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBilling(b)}
                className={cn(
                  'relative rounded-full py-2.5 transition',
                  billing === b ? 'bg-gradient-to-r from-amber-200 to-amber-400 text-ink-900 shadow-lg' : 'text-white/55 hover:text-white',
                )}
              >
                {b === 'monthly' ? 'Mensuel' : 'Annuel'}
                {b === 'yearly' && (
                  <span className={cn('ml-1.5 rounded-full px-1.5 py-0.5 text-[10px]', billing === b ? 'bg-ink-900/15' : 'bg-fit/15 text-fit')}>
                    −17 %
                  </span>
                )}
              </button>
            ))}
          </div>

          <div className="relative isolate overflow-hidden rounded-[1.75rem] border border-amber-400/30 bg-gradient-to-b from-amber-400/[0.12] via-ink-800 to-ink-800 p-6 text-center">
            <div className="absolute -top-16 left-1/2 -z-10 h-40 w-72 -translate-x-1/2 rounded-full bg-amber-400/15 blur-3xl" />
            <p className="text-sm font-semibold text-amber-200">{plan.name}</p>
            <p className="mt-2">
              <span className="font-display text-5xl font-extrabold tracking-tight text-white">
                {formatCurrency(billing === 'monthly' ? plan.priceMonthly : Math.round(plan.priceYearly / 12))}
              </span>
              <span className="text-sm text-white/50"> / mois</span>
            </p>
            <p className="mt-1 text-xs text-white/45">
              {billing === 'monthly'
                ? 'Sans engagement · résiliable à tout moment'
                : `${formatCurrency(plan.priceYearly)} facturés par an · tu économises ${formatCurrency(yearlySaving)}`}
            </p>
            <Button
              fullWidth
              size="lg"
              variant="premium"
              className="shine group mt-6"
              onClick={openCheckout}
              rightIcon={<ArrowRight size={18} className="transition group-hover:translate-x-1" />}
            >
              Devenir Premium
            </Button>
            <div className="mt-4 flex items-center justify-center gap-1.5">
              {(['orange_money', 'mtn_momo', 'moov_money', 'wave', 'card'] as const).map((id) => (
                <MethodMark key={id} method={id} size="sm" />
              ))}
            </div>
            <p className="mt-2 text-[11px] text-white/35">Mobile Money ou carte bancaire · paiement sécurisé</p>
          </div>
        </section>
      )}

      {/* ---------- Code promo ---------- */}
      <PromoRedeem onRedeemed={reload} />

      {/* ---------- Avantages ---------- */}
      <section>
        <SectionTitle title={running ? 'Tes avantages' : 'Ce que tu débloques'} icon={<Crown />} />
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
          {benefits.map(({ icon: Icon, title, text }) => (
            <div key={title} className="surface rounded-3xl p-4">
              <span className="grid h-10 w-10 place-items-center rounded-2xl bg-gradient-to-br from-amber-300/25 to-amber-500/10 text-amber-300">
                <Icon size={19} />
              </span>
              <p className="mt-3 text-sm font-bold text-white">{title}</p>
              <p className="mt-0.5 text-xs leading-snug text-white/50">{text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------- Historique ---------- */}
      {payments.length > 0 && (
        <section>
          <SectionTitle title="Mes paiements" icon={<FileText />} />
          <Card padding="none" className="divide-y divide-white/[0.06] overflow-hidden">
            {payments.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setReceipt(p)}
                className="flex w-full items-center gap-3 p-3.5 text-left transition hover:bg-white/[0.03]"
              >
                <MethodMark method={p.method} size="sm" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">Premium {p.billing === 'monthly' ? 'mensuel' : 'annuel'}</span>
                  <span className="block truncate text-xs text-white/45">
                    {formatDate(p.paidAt ?? p.createdAt)} · {p.reference}
                  </span>
                </span>
                <span className="flex flex-col items-end gap-1">
                  <span className="text-sm font-bold text-white">{formatCurrency(p.amount)}</span>
                  <Badge tone={statusLabels[p.status].tone}>{statusLabels[p.status].label}</Badge>
                </span>
              </button>
            ))}
          </Card>
        </section>
      )}

      {/* ---------- Comparatif ---------- */}
      <section>
        <SectionTitle title="Gratuit ou Premium ?" icon={<Check />} />
        <div className="space-y-2.5">
          {groups.map((g) => {
            const rows = offerComparison.filter((r) => g.features.includes(r.feature))
            const isOpen = openGroup === g.title
            return (
              <div key={g.title} className="surface overflow-hidden rounded-3xl">
                <button
                  type="button"
                  onClick={() => setOpenGroup(isOpen ? null : g.title)}
                  className="flex w-full items-center justify-between gap-3 p-4 text-left"
                >
                  <span className="font-display text-base font-bold text-white">{g.title}</span>
                  <span className="flex items-center gap-3 text-xs text-white/40">
                    {rows.filter((r) => r.freeAccess !== 'yes').length} avantages Premium
                    <ChevronDown size={18} className={cn('transition', isOpen && 'rotate-180')} />
                  </span>
                </button>
                {isOpen && (
                  <div className="border-t border-white/[0.06]">
                    <div className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-white/35">
                      <span />
                      <span className="w-14 text-center">Gratuit</span>
                      <span className="w-14 text-center text-amber-300">Premium</span>
                    </div>
                    {rows.map((r) => (
                      <div key={r.feature} className="grid grid-cols-[1fr_auto_auto] items-center gap-x-4 border-t border-white/[0.04] px-4 py-3">
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-white">{r.feature}</p>
                          <p className="mt-0.5 text-xs text-white/45">{r.premium}</p>
                        </div>
                        <span className="flex w-14 justify-center" title={r.free}>
                          <AccessIcon access={r.freeAccess} />
                        </span>
                        <span className="flex w-14 justify-center">
                          <span className="grid h-6 w-6 place-items-center rounded-full bg-gradient-to-br from-amber-200 to-amber-400 text-ink-900">
                            <Check size={13} strokeWidth={3} />
                          </span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
        <div className="mt-3 flex flex-wrap justify-center gap-4 text-[11px] text-white/40">
          <span className="inline-flex items-center gap-1.5"><AccessIcon access="yes" /> Inclus</span>
          <span className="inline-flex items-center gap-1.5"><AccessIcon access="limited" /> Limité</span>
          <span className="inline-flex items-center gap-1.5"><AccessIcon access="no" /> Non disponible</span>
        </div>
      </section>

      <p className="text-center text-[11px] text-white/30">
        Mode démo : le prestataire de paiement est simulé, aucun montant réel n’est débité.
      </p>

      {/* ---------- Fenêtres ---------- */}
      {checkout && (
        <CheckoutModal
          key={checkoutKey}
          open
          onClose={() => {
            setCheckout(false)
            void syncData()
          }}
          onPaid={() => {
            void refresh()
            void syncData()
          }}
          initialBilling={running && sub ? sub.billing : billing}
          defaultPhone={user.phone ?? ''}
        />
      )}

      <Modal open={!!receipt} onClose={() => setReceipt(null)} title="Reçu de paiement">
        {receipt && <Receipt payment={receipt} name={`${user.firstName} ${user.lastName}`} email={user.email} />}
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setReceipt(null)}>
            Fermer
          </Button>
          <Button onClick={() => window.print()} leftIcon={<Printer size={16} />}>
            Imprimer
          </Button>
        </div>
      </Modal>

      <Modal open={confirmCancel} onClose={() => setConfirmCancel(false)} title="Résilier ton abonnement ?" size="sm">
        <p className="text-sm leading-relaxed text-white/70">
          Tu gardes tous tes avantages Premium jusqu’au <b className="text-white">{sub ? formatDate(sub.renewsAt) : ''}</b>. Ensuite,
          ton compte repassera en version gratuite. Tu peux réactiver le renouvellement à tout moment.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setConfirmCancel(false)}>
            Garder Premium
          </Button>
          <Button variant="danger" onClick={cancel} loading={busy}>
            Résilier
          </Button>
        </div>
      </Modal>
    </div>
  )
}
