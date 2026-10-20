import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, CreditCard, ExternalLink, Lock, ShieldCheck, Smartphone, XCircle } from 'lucide-react'
import { Capacitor } from '@capacitor/core'
import type { Payment, PaymentMethod, Subscription } from '@/types'
import { api } from '@/services'
import { Button, Input, Modal } from '@/components/ui'
import { paymentMethodById, paymentMethods, planById } from '@/data/plans'
import { formatCurrency } from '@/utils/format'
import { cn } from '@/utils/cn'

type Step = 'offer' | 'method' | 'processing' | 'success' | 'failed'

/** Mode serveur : paiement réel via la page sécurisée FedaPay. Sinon : prestataire simulé (démo). */
const LIVE = import.meta.env.VITE_DATA_MODE === 'api'

function openCheckout(url: string, win?: Window | null) {
  if (win && !win.closed) win.location.href = url
  else window.open(url, '_blank', 'noopener')
}

export function MethodMark({ method, size = 'md' }: { method: PaymentMethod; size?: 'sm' | 'md' }) {
  const m = paymentMethodById(method)
  return (
    <span
      className={cn(
        'grid shrink-0 place-items-center rounded-xl font-display font-extrabold',
        size === 'sm' ? 'h-8 w-8 text-[9px]' : 'h-11 w-11 text-[10px]',
        m.id === 'mtn_momo' ? 'text-ink-900' : 'text-white',
      )}
      style={{ backgroundColor: m.color }}
      aria-hidden
    >
      {m.kind === 'card' ? <CreditCard size={size === 'sm' ? 15 : 19} /> : m.short}
    </span>
  )
}

interface CheckoutModalProps {
  open: boolean
  onClose: () => void
  /** Appelé quand le paiement est confirmé. */
  onPaid: (payment: Payment) => void
  initialBilling?: Subscription['billing']
  defaultPhone?: string
}

export function CheckoutModal({ open, onClose, onPaid, initialBilling = 'monthly', defaultPhone = '' }: CheckoutModalProps) {
  const plan = planById('premium')
  const [step, setStep] = useState<Step>('offer')
  const [billing, setBilling] = useState<Subscription['billing']>(initialBilling)
  const [method, setMethod] = useState<PaymentMethod>('orange_money')
  const [phone, setPhone] = useState(defaultPhone)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [payment, setPayment] = useState<Payment | null>(null)
  const timer = useRef<number>()

  const amount = billing === 'monthly' ? plan.priceMonthly : plan.priceYearly
  const m = paymentMethodById(method)

  // Interroge le statut du paiement jusqu'à la réponse (2 min en démo, 15 min sur la page FedaPay).
  useEffect(() => {
    if (step !== 'processing' || !payment) return
    const started = Date.now()
    const poll = async () => {
      try {
        const p = await api.getPayment(payment.id)
        if (p.status === 'succeeded') {
          setPayment(p)
          setStep('success')
          onPaid(p)
          return
        }
        if (p.status === 'failed') {
          setPayment(p)
          setStep('failed')
          return
        }
      } catch {
        /* nouvelle tentative au prochain tour */
      }
      if (Date.now() - started > (LIVE ? 900_000 : 120_000)) {
        setError('Pas de confirmation du paiement. Si tu as été débité, contacte le support avec ta référence.')
        setStep('failed')
        return
      }
      timer.current = window.setTimeout(poll, 1500)
    }
    timer.current = window.setTimeout(poll, 1500)
    return () => window.clearTimeout(timer.current)
  }, [step, payment, onPaid])

  const pay = async () => {
    setError('')
    if (!LIVE && m.kind === 'mobile' && phone.replace(/\D/g, '').replace(/^225/, '').length < 8) {
      setError('Indique le numéro du compte Mobile Money à débiter.')
      return
    }
    // Sur le web, l'onglet est ouvert pendant le clic pour ne pas être bloqué par le navigateur.
    const win = LIVE && !Capacitor.isNativePlatform() ? window.open('about:blank', '_blank') : null
    setBusy(true)
    try {
      const p = await api.startCheckout({ plan: plan.id, billing, method, phone: !LIVE && m.kind === 'mobile' ? phone : undefined })
      if (p.checkoutUrl) openCheckout(p.checkoutUrl, win)
      else win?.close()
      setPayment(p)
      setStep('processing')
    } catch (err) {
      win?.close()
      setError(err instanceof Error ? err.message : 'Paiement impossible')
    } finally {
      setBusy(false)
    }
  }

  const close = () => {
    window.clearTimeout(timer.current)
    onClose()
  }

  /** Arrête l'attente : le paiement non finalisé n'active rien et peut être relancé. */
  const stopWaiting = () => {
    window.clearTimeout(timer.current)
    setPayment(null)
    setError('')
    setStep('method')
  }

  const titles: Record<Step, string> = {
    offer: 'Passer Premium',
    method: 'Moyen de paiement',
    processing: 'Validation du paiement',
    success: 'Paiement confirmé',
    failed: 'Paiement non abouti',
  }

  return (
    <Modal open={open} onClose={step === 'processing' ? () => undefined : close} title={titles[step]}>
      {/* Étape 1 : formule */}
      {step === 'offer' && (
        <div className="space-y-4">
          <div className="grid gap-3">
            {(['monthly', 'yearly'] as const).map((b) => {
              const price = b === 'monthly' ? plan.priceMonthly : plan.priceYearly
              const active = billing === b
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setBilling(b)}
                  className={cn(
                    'flex items-center gap-3 rounded-2xl border p-4 text-left transition',
                    active ? 'border-amber-400 bg-amber-400/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
                  )}
                >
                  <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', active ? 'border-amber-400' : 'border-white/30')}>
                    {active && <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold text-white">{b === 'monthly' ? 'Mensuel' : 'Annuel'}</span>
                    <span className="block text-xs text-white/50">
                      {b === 'monthly' ? 'Sans engagement, résiliable à tout moment' : `Soit ${formatCurrency(Math.round(price / 12))} / mois`}
                    </span>
                  </span>
                  <span className="text-right">
                    <span className="block font-display text-lg font-extrabold text-white">{formatCurrency(price)}</span>
                    {b === 'yearly' && (
                      <span className="rounded-full bg-fit/15 px-2 py-0.5 text-[10px] font-bold text-fit">2 mois offerts</span>
                    )}
                  </span>
                </button>
              )
            })}
          </div>
          <Button fullWidth size="lg" variant="premium" onClick={() => setStep('method')} rightIcon={<ArrowRight size={18} />}>
            Continuer · {formatCurrency(amount)}
          </Button>
        </div>
      )}

      {/* Étape 2 : moyen de paiement */}
      {step === 'method' && (
        <div className="space-y-4">
          <div className="grid gap-2">
            {paymentMethods.map((pm) => (
              <button
                key={pm.id}
                type="button"
                onClick={() => setMethod(pm.id)}
                className={cn(
                  'flex items-center gap-3 rounded-2xl border p-3 text-left transition',
                  method === pm.id ? 'border-fit bg-fit/10' : 'border-white/10 bg-white/[0.03] hover:border-white/25',
                )}
              >
                <MethodMark method={pm.id} />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-white">{pm.label}</span>
                  <span className="block truncate text-xs text-white/45">{pm.hint}</span>
                </span>
                <span className={cn('grid h-5 w-5 place-items-center rounded-full border-2', method === pm.id ? 'border-fit' : 'border-white/30')}>
                  {method === pm.id && <span className="h-2.5 w-2.5 rounded-full bg-fit" />}
                </span>
              </button>
            ))}
          </div>

          {LIVE ? (
            <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
              <Lock size={14} className="mt-0.5 shrink-0 text-fit" />
              Tu finaliseras le paiement ({m.kind === 'mobile' ? 'numéro Mobile Money' : 'carte bancaire'}) sur la page
              sécurisée FedaPay qui va s’ouvrir. FitLife ne voit ni ne conserve ces informations.
            </p>
          ) : m.kind === 'mobile' ? (
            <Input
              label={`Numéro ${m.label}`}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="07 00 00 00 00"
              leftIcon={<Smartphone size={16} />}
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              hint="Une demande de paiement sera envoyée sur ce numéro."
            />
          ) : (
            <p className="flex items-start gap-2 rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-xs text-white/60">
              <Lock size={14} className="mt-0.5 shrink-0 text-fit" />
              Tes informations de carte sont saisies sur la page sécurisée du prestataire de paiement. FitLife ne les
              voit ni ne les conserve.
            </p>
          )}

          <div className="flex items-center justify-between rounded-2xl bg-white/[0.04] px-4 py-3 text-sm">
            <span className="text-white/60">
              Premium {billing === 'monthly' ? 'mensuel' : 'annuel'}
            </span>
            <span className="font-display text-lg font-extrabold text-white">{formatCurrency(amount)}</span>
          </div>

          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="w-14 shrink-0 px-0" onClick={() => setStep('offer')} aria-label="Retour">
              <ArrowLeft size={18} />
            </Button>
            <Button fullWidth size="lg" onClick={pay} loading={busy} leftIcon={<ShieldCheck size={18} />}>
              Payer {formatCurrency(amount)}
            </Button>
          </div>
          <p className="text-center text-[11px] text-white/35">
            {LIVE
              ? 'Paiement sécurisé par FedaPay · Mobile Money et carte bancaire.'
              : 'Paiement sécurisé · Mode démo : le prestataire est simulé, aucun montant n’est débité.'}
          </p>
        </div>
      )}

      {/* Étape 3 : attente opérateur */}
      {step === 'processing' && payment && (
        <div className="space-y-5 py-2 text-center">
          <div className="relative mx-auto grid h-20 w-20 place-items-center">
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-fit/30" />
            <span className="relative grid h-20 w-20 place-items-center rounded-full border border-fit/30 bg-fit/10">
              <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-fit border-t-transparent" />
            </span>
          </div>
          {payment.checkoutUrl ? (
            <div>
              <p className="font-display text-lg font-bold text-white">Termine le paiement sur FedaPay</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                Paie {formatCurrency(payment.amount)} sur la page sécurisée FedaPay. Premium s’activera ici
                automatiquement dès la confirmation.
              </p>
            </div>
          ) : m.kind === 'mobile' ? (
            <div>
              <p className="font-display text-lg font-bold text-white">Valide sur ton téléphone</p>
              <p className="mt-1 text-sm leading-relaxed text-white/60">
                Une demande de {formatCurrency(payment.amount)} a été envoyée au <b className="text-white">{payment.phoneMasked}</b>.
                <br />
                {m.hint}
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-lg font-bold text-white">Paiement sécurisé en cours</p>
              <p className="mt-1 text-sm text-white/60">Finalise le paiement par carte sur la page du prestataire.</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={stopWaiting}>
              Annuler
            </Button>
            {payment.checkoutUrl && (
              <Button fullWidth leftIcon={<ExternalLink size={16} />} onClick={() => openCheckout(payment.checkoutUrl!)}>
                Ouvrir la page de paiement
              </Button>
            )}
          </div>
          <p className="text-xs text-white/35">Référence {payment.reference} · ne ferme pas cette fenêtre</p>
        </div>
      )}

      {/* Étape 4 : résultat */}
      {step === 'success' && payment && (
        <div className="space-y-5 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-gradient-to-br from-fit to-fit-dark text-white shadow-fit">
            <CheckCircle2 size={38} />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold text-white">Bienvenue dans Premium !</p>
            <p className="mt-1 text-sm text-white/60">Toutes les fonctionnalités sont débloquées.</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-left text-sm">
            {[
              ['Montant', formatCurrency(payment.amount)],
              ['Moyen', paymentMethodById(payment.method).label],
              ['Référence', payment.reference],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between py-1">
                <span className="text-white/50">{k}</span>
                <span className="font-semibold text-white">{v}</span>
              </div>
            ))}
          </div>
          <Button fullWidth size="lg" onClick={close}>
            C’est parti
          </Button>
        </div>
      )}

      {step === 'failed' && (
        <div className="space-y-5 text-center">
          <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-red-500/15 text-red-300">
            <XCircle size={38} />
          </div>
          <div>
            <p className="font-display text-xl font-extrabold text-white">Le paiement n’a pas abouti</p>
            <p className="mt-1 text-sm text-white/60">{payment?.failureReason || error || 'Aucun montant n’a été débité.'}</p>
          </div>
          <div className="flex gap-3">
            <Button variant="secondary" fullWidth onClick={close}>
              Fermer
            </Button>
            <Button
              fullWidth
              onClick={() => {
                setError('')
                setPayment(null)
                setStep('method')
              }}
            >
              Réessayer
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
