import { useState } from 'react'
import { CheckCircle2, Ticket } from 'lucide-react'
import { api } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { Button, Card } from '@/components/ui'

/** Saisie d'un code promo : débloque Premium pour la durée prévue par le coach / l'admin. */
export function PromoRedeem({ onRedeemed }: { onRedeemed?: () => void }) {
  const { setUser } = useAuth()
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const redeem = async () => {
    if (!code.trim()) return setError('Saisis ton code promo.')
    setBusy(true)
    setError('')
    try {
      const r = await api.redeemPromoCode(code.trim())
      setUser(r.user)
      setSuccess(`Premium activé pour ${r.days} jours, jusqu’au ${new Date(r.premiumUntil).toLocaleDateString('fr-FR')}.`)
      setCode('')
      onRedeemed?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Code refusé')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-3">
        <span className="grid h-10 w-10 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Ticket size={18} />
        </span>
        <div>
          <p className="font-bold text-white">J’ai un code promo</p>
          <p className="text-xs text-white/55">Un code donné par un coach ou par FitLife débloque Premium gratuitement.</p>
        </div>
      </div>
      {success ? (
        <p className="flex items-start gap-2 rounded-xl border border-fit/30 bg-fit/10 px-3 py-2 text-sm text-white">
          <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-fit" /> {success}
        </p>
      ) : (
        <form
          className="flex gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            void redeem()
          }}
        >
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="FIT-XXXXXXXX"
            autoCapitalize="characters"
            autoComplete="off"
            className="h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-ink-800 px-4 font-mono text-sm tracking-wider text-white placeholder:text-white/25 outline-none focus:border-amber-400/50"
          />
          <Button type="submit" variant="premium" loading={busy}>
            Valider
          </Button>
        </form>
      )}
      {error && <p className="text-sm text-red-300">{error}</p>}
    </Card>
  )
}
