import { useState } from 'react'
import { CheckCircle2, KeyRound } from 'lucide-react'
import { api } from '@/services'
import { Button, Modal } from '@/components/ui'
import { PasswordInput } from '@/components/ui/Input'
import { cn } from '@/utils/cn'

/** Force du mot de passe : longueur, chiffres, majuscules, caractères spéciaux. */
function strength(pw: string): { score: number; label: string } {
  let score = 0
  if (pw.length >= 8) score++
  if (pw.length >= 12) score++
  if (/\d/.test(pw) && /[a-zA-Z]/.test(pw)) score++
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++
  if (/[^a-zA-Z0-9]/.test(pw)) score++
  const labels = ['Très faible', 'Faible', 'Moyen', 'Bon', 'Fort', 'Excellent']
  return { score, label: labels[score] }
}

interface ChangePasswordModalProps {
  open: boolean
  onClose: () => void
}

/** Changement du mot de passe : disponible pour tous les rôles (membre, coach, admin, super admin). */
export function ChangePasswordModal({ open, onClose }: ChangePasswordModalProps) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [done, setDone] = useState(false)
  const s = strength(next)

  const reset = () => {
    setCurrent('')
    setNext('')
    setConfirm('')
    setError('')
    setDone(false)
  }

  const close = () => {
    if (busy) return
    reset()
    onClose()
  }

  const submit = async () => {
    setError('')
    if (!current) return setError('Indique ton mot de passe actuel.')
    if (next.length < 8) return setError('Le nouveau mot de passe doit contenir au moins 8 caractères.')
    if (next === current) return setError('Le nouveau mot de passe doit être différent de l’actuel.')
    if (next !== confirm) return setError('Les deux nouveaux mots de passe ne correspondent pas.')
    setBusy(true)
    try {
      await api.changePassword(current, next)
      setDone(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Changement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={close} title="Changer mon mot de passe" size="sm">
      {done ? (
        <div className="space-y-4 text-center">
          <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-fit/15 text-fit">
            <CheckCircle2 size={32} />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-white">Mot de passe modifié</p>
            <p className="mt-1 text-sm text-white/60">
              Utilise-le à ta prochaine connexion. Tes autres appareils connectés ont été déconnectés.
            </p>
          </div>
          <Button fullWidth onClick={close}>
            Terminé
          </Button>
        </div>
      ) : (
        <form
          className="space-y-3"
          onSubmit={(e) => {
            e.preventDefault()
            void submit()
          }}
        >
          <PasswordInput
            label="Mot de passe actuel"
            autoComplete="current-password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
          />
          <PasswordInput
            label="Nouveau mot de passe"
            autoComplete="new-password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            hint="8 caractères minimum. Mélange lettres, chiffres et symboles."
          />
          {next && (
            <div className="space-y-1">
              <div className="flex gap-1">
                {[0, 1, 2, 3, 4].map((i) => (
                  <span
                    key={i}
                    className={cn(
                      'h-1.5 flex-1 rounded-full transition',
                      i < s.score ? (s.score <= 1 ? 'bg-red-400' : s.score <= 2 ? 'bg-amber-400' : 'bg-fit') : 'bg-white/10',
                    )}
                  />
                ))}
              </div>
              <p className="text-xs text-white/50">Sécurité : {s.label}</p>
            </div>
          )}
          <PasswordInput
            label="Confirmer le nouveau mot de passe"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
          />
          {error && <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="secondary" onClick={close} disabled={busy}>
              Annuler
            </Button>
            <Button type="submit" loading={busy} leftIcon={<KeyRound size={15} />}>
              Enregistrer
            </Button>
          </div>
        </form>
      )}
    </Modal>
  )
}
