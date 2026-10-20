import { useState } from 'react'
import { Check, Copy, Plus, Power, Ticket, Trash2 } from 'lucide-react'
import type { PromoCode } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Badge, Button, Card, EmptyState, Input, Modal, Spinner } from '@/components/ui'
import { formatDate } from '@/utils/format'

const DURATIONS = [7, 15, 30, 90, 180, 365]

function status(p: PromoCode): { label: string; tone: 'fit' | 'gray' | 'red' | 'amber' } {
  if (!p.active) return { label: 'Désactivé', tone: 'gray' }
  if (p.expiresAt && new Date(p.expiresAt).getTime() < Date.now()) return { label: 'Expiré', tone: 'red' }
  if (p.maxUses !== null && p.uses >= p.maxUses) return { label: 'Épuisé', tone: 'amber' }
  return { label: 'Actif', tone: 'fit' }
}

/** Création et suivi des codes promo Premium (coachs et administrateurs). */
export function PromoCodesManager({ onToast }: { onToast: (message: string) => void }) {
  const { data, loading, setData } = useAsync(() => api.getPromoCodes(), [])
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({ code: '', days: '30', maxUses: '', expiresAt: '', note: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [copied, setCopied] = useState('')

  if (loading || !data) return <Spinner label="Chargement des codes promo…" />

  const create = async () => {
    setError('')
    const days = Number(form.days)
    if (!Number.isInteger(days) || days < 1 || days > 3650) return setError('Durée : entre 1 et 3650 jours.')
    setBusy(true)
    try {
      const promo = await api.createPromoCode({
        code: form.code.trim() || undefined,
        days,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt ? new Date(`${form.expiresAt}T23:59:59`).toISOString() : null,
        note: form.note.trim() || undefined,
      })
      setData([promo, ...data])
      setOpen(false)
      setForm({ code: '', days: '30', maxUses: '', expiresAt: '', note: '' })
      onToast(`Code ${promo.code} créé : ${promo.days} jours de Premium`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Création impossible')
    } finally {
      setBusy(false)
    }
  }

  const copy = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
    } catch {
      /* presse-papiers indisponible */
    }
    setCopied(code)
    window.setTimeout(() => setCopied(''), 1500)
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-amber-400/15 text-amber-300">
          <Ticket size={20} />
        </span>
        <div className="flex-1">
          <p className="font-bold text-white">Codes promo Premium</p>
          <p className="text-xs text-white/55">
            Crée un code et donne-le à qui tu veux : il débloque Premium pendant la durée choisie. Le membre le saisit dans
            « Mon abonnement ».
          </p>
        </div>
        <Button onClick={() => setOpen(true)} leftIcon={<Plus size={16} />}>
          Nouveau code
        </Button>
      </Card>

      {data.length === 0 ? (
        <EmptyState icon={<Ticket />} title="Aucun code promo" description="Crée ton premier code pour offrir Premium à un membre." />
      ) : (
        <div className="grid gap-3 md:grid-cols-2">
          {data.map((p) => {
            const st = status(p)
            return (
              <Card key={p.code} className="space-y-3">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void copy(p.code)}
                    className="flex min-w-0 items-center gap-2 rounded-xl border border-dashed border-amber-400/40 bg-amber-400/5 px-3 py-1.5 font-mono text-sm font-bold tracking-wider text-amber-200"
                    title="Copier le code"
                  >
                    <span className="truncate">{p.code}</span>
                    {copied === p.code ? <Check size={14} className="text-fit" /> : <Copy size={14} />}
                  </button>
                  <Badge tone={st.tone}>{st.label}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <p className="font-display text-lg font-bold text-white">{p.days}</p>
                    <p className="text-white/45">jours</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <p className="font-display text-lg font-bold text-white">
                      {p.uses}
                      {p.maxUses !== null && <span className="text-white/40">/{p.maxUses}</span>}
                    </p>
                    <p className="text-white/45">utilisations</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.04] p-2">
                    <p className="font-display text-sm font-bold leading-7 text-white">{p.expiresAt ? formatDate(p.expiresAt) : '—'}</p>
                    <p className="text-white/45">date limite</p>
                  </div>
                </div>
                {p.note && <p className="text-xs text-white/55">{p.note}</p>}
                <div className="flex items-center justify-between gap-2">
                  <p className="text-[11px] text-white/35">
                    Par {p.createdByName} · {formatDate(p.createdAt)}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      leftIcon={<Power size={14} />}
                      onClick={async () => {
                        const updated = await api.setPromoCodeActive(p.code, !p.active)
                        setData(data.map((c) => (c.code === p.code ? updated : c)))
                      }}
                    >
                      {p.active ? 'Désactiver' : 'Activer'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label="Supprimer"
                      onClick={async () => {
                        if (!window.confirm(`Supprimer le code ${p.code} ?`)) return
                        await api.deletePromoCode(p.code)
                        setData(data.filter((c) => c.code !== p.code))
                      }}
                    >
                      <Trash2 size={14} className="text-red-300" />
                    </Button>
                  </div>
                </div>
              </Card>
            )
          })}
        </div>
      )}

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Nouveau code promo" size="sm">
        <div className="space-y-3">
          <div>
            <p className="mb-1.5 text-sm font-medium text-white/80">Durée de l’accès Premium</p>
            <div className="flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setForm({ ...form, days: String(d) })}
                  className={`rounded-xl border px-3 py-1.5 text-xs font-semibold transition ${form.days === String(d) ? 'border-fit bg-fit/15 text-white' : 'border-white/10 text-white/60 hover:border-white/30'}`}
                >
                  {d === 365 ? '1 an' : `${d} jours`}
                </button>
              ))}
            </div>
          </div>
          <Input label="Ou nombre de jours" inputMode="numeric" value={form.days} onChange={(e) => setForm({ ...form, days: e.target.value.replace(/\D/g, '') })} />
          <Input
            label="Code (facultatif)"
            placeholder="Généré automatiquement"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase().replace(/[^A-Z0-9-]/g, '') })}
            hint="Ex. BIENVENUE2026. Laisse vide pour un code unique généré."
          />
          <Input
            label="Nombre maximum d’utilisations (facultatif)"
            inputMode="numeric"
            placeholder="Illimité"
            value={form.maxUses}
            onChange={(e) => setForm({ ...form, maxUses: e.target.value.replace(/\D/g, '') })}
            hint="1 = code personnel pour une seule personne."
          />
          <Input label="Valable jusqu’au (facultatif)" type="date" value={form.expiresAt} onChange={(e) => setForm({ ...form, expiresAt: e.target.value })} />
          <Input label="Note (facultatif)" placeholder="Ex. Offert à Marc" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} />
          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setOpen(false)} disabled={busy}>
            Annuler
          </Button>
          <Button onClick={() => void create()} loading={busy} leftIcon={<Ticket size={15} />}>
            Créer le code
          </Button>
        </div>
      </Modal>
    </div>
  )
}
