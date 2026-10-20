import { useState } from 'react'
import { CalendarPlus, Megaphone, Pin, Radio, Save, Video } from 'lucide-react'
import type {
  Announcement,
  AnnouncementInput,
  AnnouncementPriority,
  EventCategory,
  EventInput,
  FitEvent,
  LiveSession,
  Meal,
  MenuItem,
  MenuItemInput,
} from '@/types'
import { Button, Input, Modal, Select, Textarea } from '@/components/ui'
import { img } from '@/data/images'
import { announcementPriorityLabels, eventCategoryLabels } from '@/utils/labels'
import { fromLocalInput, toLocalInput } from '@/utils/format'
import { cn } from '@/utils/cn'

/* ---------- Petits éléments de formulaire ---------- */

function Toggle({ checked, onChange, label, hint }: { checked: boolean; onChange: (v: boolean) => void; label: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-left transition hover:border-white/20"
    >
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-white/85">{label}</span>
        {hint && <span className="block text-xs text-white/40">{hint}</span>}
      </span>
      <span className={cn('relative h-6 w-11 shrink-0 rounded-full transition', checked ? 'bg-fit' : 'bg-white/15')}>
        <span className={cn('absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all', checked ? 'left-[22px]' : 'left-0.5')} />
      </span>
    </button>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div className="grid gap-1 rounded-2xl border border-white/10 bg-ink-800 p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            'rounded-xl px-2 py-2 text-xs font-semibold transition',
            value === o.value ? 'bg-fit text-white' : 'text-white/55 hover:text-white',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

function FormError({ message }: { message: string }) {
  if (!message) return null
  return <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{message}</p>
}

/** Date par défaut d'un formulaire : dans N jours, à l'heure pile. */
function defaultDate(days: number, hour: number): string {
  const d = new Date()
  d.setDate(d.getDate() + days)
  d.setHours(hour, 0, 0, 0)
  return d.toISOString()
}

const levelOptions = [
  { value: 'beginner', label: 'Débutant' },
  { value: 'intermediate', label: 'Intermédiaire' },
  { value: 'advanced', label: 'Avancé' },
]

/* ---------- Live ---------- */

export interface LiveFormValues {
  title: string
  description: string
  coachId: string
  coachName: string
  scheduledAt: string | null
  durationMinutes: number
  level: LiveSession['level']
  premiumOnly: boolean
  startNow: boolean
}

export function LiveFormModal({
  open,
  onClose,
  initial,
  defaultCoach,
  startNow: startNowDefault = false,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: LiveSession | null
  defaultCoach: { id: string; name: string }
  startNow?: boolean
  onSubmit: (values: LiveFormValues) => Promise<void>
}) {
  const editing = !!initial
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    coachId: initial?.coachId ?? defaultCoach.id,
    coachName: initial?.coachName ?? defaultCoach.name,
    scheduledAt: toLocalInput(initial?.scheduledAt ?? defaultDate(1, 18)),
    durationMinutes: initial?.durationMinutes ?? 30,
    level: initial?.level ?? ('beginner' as LiveSession['level']),
    premiumOnly: initial?.premiumOnly ?? false,
    startNow: !editing && startNowDefault,
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const coaches =
    initial && initial.coachId !== defaultCoach.id
      ? [{ id: initial.coachId, name: initial.coachName }, defaultCoach]
      : [defaultCoach]

  const submit = async () => {
    if (!form.title.trim()) return setError('Donne un titre à ton live.')
    if (!form.startNow && !form.scheduledAt) return setError('Choisis la date et l’heure du live.')
    setError('')
    setBusy(true)
    try {
      await onSubmit({ ...form, title: form.title.trim(), scheduledAt: fromLocalInput(form.scheduledAt) })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifier le live' : form.startNow ? 'Lancer un live maintenant' : 'Programmer un live'}>
      <div className="space-y-3">
        {!editing && (
          <Segmented
            value={form.startNow ? 'now' : 'later'}
            onChange={(v) => setForm((f) => ({ ...f, startNow: v === 'now' }))}
            options={[
              { value: 'now', label: 'En direct maintenant' },
              { value: 'later', label: 'Programmer' },
            ]}
          />
        )}
        <Input label="Titre" placeholder="Full Body du matin" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Textarea
          label="Description"
          placeholder="Ce que les membres vont travailler, le matériel à prévoir…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <Select
          label="Animé par"
          value={form.coachId}
          onChange={(e) => {
            const c = coaches.find((x) => x.id === e.target.value)
            if (c) setForm((f) => ({ ...f, coachId: c.id, coachName: c.name }))
          }}
          options={coaches.map((c) => ({ value: c.id, label: c.name }))}
        />
        {!form.startNow && (
          <Input
            label="Date et heure"
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) => setForm((f) => ({ ...f, scheduledAt: e.target.value }))}
          />
        )}
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Durée (min)"
            type="number"
            min={5}
            max={240}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
          />
          <Select
            label="Niveau"
            value={form.level}
            onChange={(e) => setForm((f) => ({ ...f, level: e.target.value as LiveSession['level'] }))}
            options={levelOptions}
          />
        </div>
        <p className="flex items-start gap-2 rounded-2xl border border-fit/20 bg-fit/[0.06] px-3 py-2.5 text-xs text-white/65">
          <Video size={15} className="mt-0.5 shrink-0 text-fit" />
          Aucun lien à fournir : le direct passe par ta caméra, dans l’application. Tu pourras couper ou rallumer ta caméra à tout moment.
        </p>
        <Toggle
          checked={form.premiumOnly}
          onChange={(v) => setForm((f) => ({ ...f, premiumOnly: v }))}
          label="Réservé aux membres Premium"
          hint="Les autres membres verront le live mais ne pourront pas le rejoindre."
        />
        <FormError message={error} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button
          onClick={submit}
          loading={busy}
          leftIcon={editing ? <Save size={16} /> : form.startNow ? <Radio size={16} /> : <CalendarPlus size={16} />}
          className={cn(!editing && form.startNow && 'bg-red-500 text-white shadow-none hover:bg-red-600')}
        >
          {editing ? 'Enregistrer' : form.startNow ? 'Passer en direct' : 'Programmer'}
        </Button>
      </div>
    </Modal>
  )
}

/* ---------- Événement ---------- */

const coverPresets = [
  'photo-1590333748338-d629e4564ad9',
  'photo-1631899560971-394ded28a80f',
  'photo-1596079306903-9164c205f400',
  'photo-1665332111329-dd9d7fa46c74',
  'photo-1649888639789-b611bc359d9b',
  'photo-1583454110551-21f2fa2afe61',
].map((id) => img(id, 900, 500))

const categoryOptions = (Object.keys(eventCategoryLabels) as EventCategory[]).map((c) => ({ value: c, label: eventCategoryLabels[c] }))

export function EventFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: FitEvent | null
  onSubmit: (input: EventInput) => Promise<void>
}) {
  const editing = !!initial
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? '',
    description: initial?.description ?? '',
    category: initial?.category ?? ('meetup' as EventCategory),
    startsAt: toLocalInput(initial?.startsAt ?? defaultDate(3, 8)),
    durationMinutes: initial?.durationMinutes ?? 60,
    online: initial?.online ?? false,
    location: initial?.location ?? '',
    capacity: initial?.capacity == null ? '' : String(initial.capacity),
    coverUrl: initial?.coverUrl ?? coverPresets[0],
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!form.title.trim()) return setError('Donne un titre à l’événement.')
    if (!form.startsAt) return setError('Choisis la date et l’heure de début.')
    if (!form.online && !form.location.trim()) return setError('Indique le lieu de rendez-vous.')
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        description: form.description.trim(),
        category: form.category,
        startsAt: fromLocalInput(form.startsAt) as string,
        durationMinutes: Number(form.durationMinutes) || 60,
        online: form.online,
        location: form.location.trim() || (form.online ? 'Live FitLife' : ''),
        capacity: form.capacity === '' || Number(form.capacity) <= 0 ? null : Number(form.capacity),
        coverUrl: form.coverUrl || null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifier l’événement' : 'Créer un événement'} size="lg">
      <div className="space-y-3">
        <Input label="Titre" placeholder="Course collective du samedi" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            label="Type"
            value={form.category}
            onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as EventCategory }))}
            options={categoryOptions}
          />
          <Input label="Date et heure" type="datetime-local" value={form.startsAt} onChange={(e) => setForm((f) => ({ ...f, startsAt: e.target.value }))} />
        </div>
        <Textarea
          label="Description"
          placeholder="Programme, niveau, matériel à apporter…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <Toggle checked={form.online} onChange={(v) => setForm((f) => ({ ...f, online: v }))} label="Événement en ligne" hint="Live, visio ou conférence à distance." />
        <Input
          label={form.online ? 'Lien ou plateforme' : 'Lieu de rendez-vous'}
          placeholder={form.online ? 'Live FitLife' : 'Parc des Sports, Treichville'}
          value={form.location}
          onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3">
          <Input
            label="Durée (min)"
            type="number"
            min={5}
            value={form.durationMinutes}
            onChange={(e) => setForm((f) => ({ ...f, durationMinutes: Number(e.target.value) }))}
          />
          <Input
            label="Places"
            type="number"
            min={0}
            placeholder="Illimité"
            hint="Vide = illimité"
            value={form.capacity}
            onChange={(e) => setForm((f) => ({ ...f, capacity: e.target.value }))}
          />
        </div>
        <div>
          <p className="mb-1.5 text-sm font-medium text-white/80">Visuel</p>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
            {coverPresets.map((url) => (
              <button
                key={url}
                type="button"
                onClick={() => setForm((f) => ({ ...f, coverUrl: url }))}
                className={cn(
                  'aspect-video overflow-hidden rounded-xl border-2 transition',
                  form.coverUrl === url ? 'border-fit' : 'border-transparent opacity-60 hover:opacity-100',
                )}
              >
                <img src={url.replace('w=900', 'w=240').replace('h=500', 'h=135')} alt="" className="h-full w-full object-cover" />
              </button>
            ))}
          </div>
        </div>
        <FormError message={error} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit} loading={busy} leftIcon={editing ? <Save size={16} /> : <CalendarPlus size={16} />}>
          {editing ? 'Enregistrer' : 'Publier l’événement'}
        </Button>
      </div>
    </Modal>
  )
}

/* ---------- Annonce ---------- */

const priorityOptions = (Object.keys(announcementPriorityLabels) as AnnouncementPriority[]).map((p) => ({
  value: p,
  label: announcementPriorityLabels[p],
}))

export function AnnouncementFormModal({
  open,
  onClose,
  initial,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: Announcement | null
  onSubmit: (input: AnnouncementInput) => Promise<void>
}) {
  const editing = !!initial
  const [form, setForm] = useState(() => ({
    title: initial?.title ?? '',
    content: initial?.content ?? '',
    priority: initial?.priority ?? ('info' as AnnouncementPriority),
    pinned: initial?.pinned ?? false,
    expiresAt: toLocalInput(initial?.expiresAt),
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const submit = async () => {
    if (!form.title.trim() || !form.content.trim()) return setError('Le titre et le message sont obligatoires.')
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        title: form.title.trim(),
        content: form.content.trim(),
        priority: form.priority,
        pinned: form.pinned,
        expiresAt: fromLocalInput(form.expiresAt),
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Actualiser l’annonce' : 'Publier une annonce'}>
      <div className="space-y-3">
        <Input label="Titre" placeholder="Changement d’horaire des lives" value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        <Textarea
          label="Message"
          placeholder="L’information à transmettre aux membres…"
          value={form.content}
          onChange={(e) => setForm((f) => ({ ...f, content: e.target.value }))}
          className="min-h-[120px]"
        />
        <div>
          <p className="mb-1.5 text-sm font-medium text-white/80">Priorité</p>
          <Segmented value={form.priority} onChange={(v) => setForm((f) => ({ ...f, priority: v }))} options={priorityOptions} />
        </div>
        <Toggle
          checked={form.pinned}
          onChange={(v) => setForm((f) => ({ ...f, pinned: v }))}
          label="Épingler en haut de l’accueil"
          hint="Reste affichée avant les autres annonces."
        />
        <Input
          label="Fin d’affichage"
          type="datetime-local"
          hint="Facultatif · l’annonce disparaît automatiquement après cette date."
          value={form.expiresAt}
          onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
        />
        {!editing && (
          <p className="flex items-center gap-2 text-xs text-white/45">
            <Megaphone size={13} /> Tous les membres recevront une notification.
          </p>
        )}
        <FormError message={error} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit} loading={busy} leftIcon={editing ? <Save size={16} /> : <Pin size={16} />}>
          {editing ? 'Mettre à jour' : 'Publier'}
        </Button>
      </div>
    </Modal>
  )
}

/* ---------- Confirmation ---------- */

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = 'Supprimer',
  onConfirm,
  onClose,
}: {
  open: boolean
  title: string
  message: string
  confirmLabel?: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [busy, setBusy] = useState(false)
  return (
    <Modal open={open} onClose={onClose} title={title} size="sm">
      <p className="text-sm leading-relaxed text-white/70">{message}</p>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button
          variant="danger"
          loading={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onConfirm()
              onClose()
            } finally {
              setBusy(false)
            }
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}

/* ---------- Aliment / repas du jour ---------- */

const mealTypeOptions: { value: Meal['type']; label: string }[] = [
  { value: 'breakfast', label: 'Petit-déj.' },
  { value: 'lunch', label: 'Déjeuner' },
  { value: 'snack', label: 'Collation' },
  { value: 'dinner', label: 'Dîner' },
]

export function MenuItemFormModal({
  open,
  onClose,
  initial,
  defaults,
  onSubmit,
}: {
  open: boolean
  onClose: () => void
  initial?: MenuItem | null
  defaults: { date: string; mealType: Meal['type'] }
  onSubmit: (input: MenuItemInput) => Promise<void>
}) {
  const editing = !!initial
  const [form, setForm] = useState(() => ({
    date: initial?.date ?? defaults.date,
    mealType: initial?.mealType ?? defaults.mealType,
    name: initial?.name ?? '',
    description: initial?.description ?? '',
    calories: initial ? String(initial.calories) : '',
    protein: initial ? String(initial.protein) : '',
    carbs: initial ? String(initial.carbs) : '',
    fat: initial ? String(initial.fat) : '',
  }))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const num = (v: string) => Math.max(0, Math.round(Number(v.replace(',', '.')) || 0))

  const submit = async () => {
    if (!form.name.trim()) return setError('Indique le nom de l’aliment ou du plat.')
    if (!form.date) return setError('Choisis le jour.')
    setError('')
    setBusy(true)
    try {
      await onSubmit({
        date: form.date,
        mealType: form.mealType,
        name: form.name.trim(),
        description: form.description.trim(),
        calories: num(form.calories),
        protein: num(form.protein),
        carbs: num(form.carbs),
        fat: num(form.fat),
        imageUrl: initial?.imageUrl ?? null,
      })
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Enregistrement impossible')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={open} onClose={onClose} title={editing ? 'Modifier l’aliment' : 'Ajouter un aliment'}>
      <div className="space-y-3">
        <Input label="Jour" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
        <div>
          <p className="mb-1.5 text-sm font-medium text-white/80">Repas</p>
          <Segmented value={form.mealType} onChange={(v) => setForm((f) => ({ ...f, mealType: v }))} options={mealTypeOptions} />
        </div>
        <Input label="Aliment ou plat" placeholder="Attiéké + poisson grillé" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        <Textarea
          label="Description"
          placeholder="Quantités, préparation, conseils du coach…"
          value={form.description}
          onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
        />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Input label="Calories" inputMode="numeric" placeholder="kcal" value={form.calories} onChange={(e) => setForm((f) => ({ ...f, calories: e.target.value }))} />
          <Input label="Protéines" inputMode="numeric" placeholder="g" value={form.protein} onChange={(e) => setForm((f) => ({ ...f, protein: e.target.value }))} />
          <Input label="Glucides" inputMode="numeric" placeholder="g" value={form.carbs} onChange={(e) => setForm((f) => ({ ...f, carbs: e.target.value }))} />
          <Input label="Lipides" inputMode="numeric" placeholder="g" value={form.fat} onChange={(e) => setForm((f) => ({ ...f, fat: e.target.value }))} />
        </div>
        <FormError message={error} />
      </div>
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>
          Annuler
        </Button>
        <Button onClick={submit} loading={busy} leftIcon={<Save size={16} />}>
          {editing ? 'Enregistrer' : 'Ajouter au menu'}
        </Button>
      </div>
    </Modal>
  )
}
