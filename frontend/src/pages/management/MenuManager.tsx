import { useState } from 'react'
import { ChevronLeft, ChevronRight, Copy, Flame, Pencil, Plus, Trash2 } from 'lucide-react'
import type { Meal, MenuItem } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Button, Card, Spinner, TypeIcon, mealTypeIcons } from '@/components/ui'
import { mealImage } from '@/data/images'
import { mealTypeLabels } from '@/utils/labels'
import { todayKey } from '@/utils/id'
import { cn } from '@/utils/cn'
import { ConfirmModal, MenuItemFormModal } from './forms'

const MEALS: Meal['type'][] = ['breakfast', 'lunch', 'snack', 'dinner']

function addDays(key: string, n: number): string {
  const d = new Date(`${key}T12:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

function dayLabel(key: string) {
  const d = new Date(`${key}T12:00:00Z`)
  return {
    weekday: d.toLocaleDateString('fr-FR', { weekday: 'short', timeZone: 'UTC' }).replace('.', ''),
    day: d.toLocaleDateString('fr-FR', { day: 'numeric', timeZone: 'UTC' }),
    long: d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' }),
  }
}

type Dialog = { kind: 'form'; item?: MenuItem; mealType: Meal['type'] } | { kind: 'delete'; item: MenuItem } | null

/** Onglet « Alimentation » de l'Espace Gestion : les aliments publiés jour par jour. */
export function MenuManager({ onToast }: { onToast: (message: string) => void }) {
  const today = todayKey()
  const [weekStart, setWeekStart] = useState(today)
  const [selected, setSelected] = useState(today)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [dialogKey, setDialogKey] = useState(0)
  const [copying, setCopying] = useState(false)

  const weekEnd = addDays(weekStart, 6)
  const { data, loading, setData } = useAsync(() => api.getMenu(weekStart, weekEnd), [weekStart])
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const shiftWeek = (n: number) => {
    const start = addDays(weekStart, n * 7)
    setWeekStart(start)
    setSelected(start)
  }
  const open = (d: Dialog) => {
    setDialogKey((k) => k + 1)
    setDialog(d)
  }

  const items = (data ?? []).filter((m) => m.date === selected)
  const totals = items.reduce(
    (t, m) => ({ kcal: t.kcal + m.calories, p: t.p + m.protein, c: t.c + m.carbs, f: t.f + m.fat }),
    { kcal: 0, p: 0, c: 0, f: 0 },
  )

  const save = async (input: Parameters<typeof api.createMenuItem>[0], existing?: MenuItem) => {
    const saved = existing ? await api.updateMenuItem(existing.id, input) : await api.createMenuItem(input)
    const rest = (data ?? []).filter((m) => m.id !== saved.id)
    setData(saved.date >= weekStart && saved.date <= weekEnd ? [...rest, saved] : rest)
    onToast(existing ? 'Aliment mis à jour' : 'Aliment ajouté au menu')
  }

  const remove = async (item: MenuItem) => {
    await api.deleteMenuItem(item.id)
    setData((data ?? []).filter((m) => m.id !== item.id))
    onToast('Aliment retiré du menu')
  }

  const copyToNextDay = async () => {
    const target = addDays(selected, 1)
    setCopying(true)
    try {
      const created = await Promise.all(
        items.map(({ id: _id, createdBy: _by, updatedAt: _at, ...rest }) => {
          void _id
          void _by
          void _at
          return api.createMenuItem({ ...rest, date: target })
        }),
      )
      setData([...(data ?? []), ...created.filter((m) => m.date <= weekEnd)])
      setSelected(target)
      if (target > weekEnd) shiftWeek(1)
      onToast(`Menu copié sur ${dayLabel(target).long}`)
    } finally {
      setCopying(false)
    }
  }

  return (
    <div className="space-y-4">
      {/* Semaine */}
      <Card padding="sm">
        <div className="mb-3 flex items-center justify-between px-1">
          <button
            type="button"
            onClick={() => shiftWeek(-1)}
            className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Semaine précédente"
          >
            <ChevronLeft size={18} />
          </button>
          <p className="text-sm font-semibold text-white">
            Du {dayLabel(weekStart).day} au {dayLabel(weekEnd).long.split(' ').slice(1).join(' ')}
          </p>
          <button
            type="button"
            onClick={() => shiftWeek(1)}
            className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/5 hover:text-white"
            aria-label="Semaine suivante"
          >
            <ChevronRight size={18} />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-1.5">
          {days.map((d) => {
            const l = dayLabel(d)
            const count = (data ?? []).filter((m) => m.date === d).length
            const active = d === selected
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelected(d)}
                className={cn(
                  'flex flex-col items-center gap-0.5 rounded-2xl py-2 transition',
                  active ? 'bg-fit text-white shadow-fit' : 'text-white/60 hover:bg-white/5',
                )}
              >
                <span className="text-[10px] font-semibold uppercase">{l.weekday}</span>
                <span className="font-display text-lg font-extrabold leading-none">{l.day}</span>
                <span className={cn('mt-1 h-1.5 w-1.5 rounded-full', count ? (active ? 'bg-ink-900' : 'bg-fit') : 'bg-transparent')} />
              </button>
            )
          })}
        </div>
      </Card>

      {/* Jour sélectionné */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-display text-lg font-bold capitalize text-white">
            {dayLabel(selected).long}
            {selected === today && <span className="ml-2 rounded-full bg-fit/15 px-2 py-0.5 align-middle text-[10px] font-bold text-fit">AUJOURD’HUI</span>}
          </p>
          <p className="mt-0.5 flex items-center gap-1.5 text-xs text-white/50">
            <Flame size={12} className="text-amber-300" /> {totals.kcal} kcal · P {totals.p} g · G {totals.c} g · L {totals.f} g
          </p>
        </div>
        <div className="flex gap-2">
          {items.length > 0 && (
            <Button size="sm" variant="secondary" onClick={copyToNextDay} loading={copying} leftIcon={<Copy size={14} />}>
              Copier au lendemain
            </Button>
          )}
          <Button size="sm" onClick={() => open({ kind: 'form', mealType: 'breakfast' })} leftIcon={<Plus size={14} />}>
            Ajouter
          </Button>
        </div>
      </div>

      {loading || !data ? (
        <Spinner label="Chargement du menu…" />
      ) : (
        <div className="space-y-4">
          {MEALS.map((type) => {
            const list = items.filter((m) => m.mealType === type)
            return (
              <section key={type}>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-white">
                    <span className="grid h-7 w-7 place-items-center rounded-lg bg-fit/15 text-fit">
                      <TypeIcon icon={mealTypeIcons[type]} size={14} />
                    </span>
                    {mealTypeLabels[type]}
                  </h3>
                  <button
                    type="button"
                    onClick={() => open({ kind: 'form', mealType: type })}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-fit hover:underline"
                  >
                    <Plus size={13} /> Ajouter
                  </button>
                </div>
                {list.length === 0 ? (
                  <button
                    type="button"
                    onClick={() => open({ kind: 'form', mealType: type })}
                    className="w-full rounded-2xl border border-dashed border-white/10 py-4 text-xs text-white/35 transition hover:border-fit/40 hover:text-white/60"
                  >
                    Aucun aliment prévu · cliquer pour ajouter
                  </button>
                ) : (
                  <div className="space-y-2">
                    {list.map((m) => (
                      <Card key={m.id} padding="sm" className="flex items-start gap-3">
                        <img
                          src={mealImage({ name: m.name, type: m.mealType, imageUrl: m.imageUrl ?? undefined }, 160)}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-xl object-cover"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-white">{m.name}</p>
                          {m.description && <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-white/55">{m.description}</p>}
                          <p className="mt-1 text-[11px] text-white/40">
                            {m.calories} kcal · P {m.protein} g · G {m.carbs} g · L {m.fat} g
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            type="button"
                            onClick={() => open({ kind: 'form', item: m, mealType: m.mealType })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-white/5 hover:text-white"
                            aria-label="Modifier"
                          >
                            <Pencil size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => open({ kind: 'delete', item: m })}
                            className="grid h-8 w-8 place-items-center rounded-lg text-white/50 hover:bg-red-500/10 hover:text-red-300"
                            aria-label="Supprimer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </Card>
                    ))}
                  </div>
                )}
              </section>
            )
          })}
        </div>
      )}

      {dialog?.kind === 'form' && (
        <MenuItemFormModal
          key={dialogKey}
          open
          onClose={() => setDialog(null)}
          initial={dialog.item}
          defaults={{ date: selected, mealType: dialog.mealType }}
          onSubmit={(input) => save(input, dialog.item)}
        />
      )}
      {dialog?.kind === 'delete' && (
        <ConfirmModal
          key={dialogKey}
          open
          title="Retirer cet aliment ?"
          message={`« ${dialog.item.name} » ne sera plus proposé aux membres pour ce jour.`}
          confirmLabel="Retirer"
          onConfirm={() => remove(dialog.item)}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  )
}
