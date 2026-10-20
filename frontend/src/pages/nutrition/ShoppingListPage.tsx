import { useState } from 'react'
import { Plus, RefreshCw, ShoppingCart } from 'lucide-react'
import type { ShoppingItem } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Button, Card, Input, Spinner } from '@/components/ui'
import { cn } from '@/utils/cn'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { Check } from 'lucide-react'

export function ShoppingListPage() {
  const { data, loading } = useAsync(() => api.getShoppingList(), [])
  const [items, setItems] = useState<ShoppingItem[] | null>(null)
  const [newName, setNewName] = useState('')
  const [newQty, setNewQty] = useState('')
  const [busy, setBusy] = useState(false)

  if (loading || !data) return <Spinner label="Génération de ta liste de courses…" />

  const list = items ?? data
  const checkedCount = list.filter((i) => i.checked).length
  const grouped = list.reduce<Record<string, ShoppingItem[]>>((acc, item) => {
    acc[item.category] = acc[item.category] ?? []
    acc[item.category].push(item)
    return acc
  }, {})

  const toggle = async (id: string) => setItems(await api.toggleShoppingItem(id))
  const regenerate = async () => {
    setBusy(true)
    try {
      setItems(await api.regenerateShoppingList())
    } finally {
      setBusy(false)
    }
  }
  const add = async () => {
    if (!newName.trim()) return
    setItems(await api.addShoppingItem(newName.trim(), newQty.trim() || '1'))
    setNewName('')
    setNewQty('')
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        back="/nutrition"
        eyebrow="Nutrition"
        title="Ma liste de courses"
        subtitle={`Générée depuis ton plan alimentaire · ${checkedCount}/${list.length} achetés`}
        image={pageHeroes.shopping}
      />

      <Card className="flex items-center gap-2" padding="sm">
        <Input placeholder="Article" value={newName} onChange={(e) => setNewName(e.target.value)} />
        <Input placeholder="Qté" value={newQty} onChange={(e) => setNewQty(e.target.value)} className="max-w-[90px]" />
        <Button size="icon" onClick={add} aria-label="Ajouter">
          <Plus size={18} />
        </Button>
      </Card>

      <Button variant="secondary" fullWidth onClick={regenerate} loading={busy} leftIcon={<RefreshCw size={16} />}>
        Regénérer depuis mon programme
      </Button>

      {list.length === 0 ? (
        <Card className="flex flex-col items-center gap-2 py-8 text-center text-sm text-white/50">
          <ShoppingCart size={28} className="text-white/30" />
          Ta liste est vide. Regénère-la depuis ton programme alimentaire.
        </Card>
      ) : (
        <div className="space-y-5">
          {Object.entries(grouped).map(([category, catItems]) => (
            <section key={category}>
              <h2 className="mb-2 text-xs font-bold uppercase tracking-wide text-fit">{category}</h2>
              <div className="space-y-2">
                {catItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => toggle(item.id)}
                    className="surface flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left transition hover:border-fit/30"
                  >
                    <span
                      className={cn(
                        'grid h-6 w-6 shrink-0 place-items-center rounded-lg border transition',
                        item.checked ? 'border-fit bg-fit text-white' : 'border-white/20',
                      )}
                    >
                      {item.checked && <Check size={14} strokeWidth={3} />}
                    </span>
                    <span className={cn('flex-1 text-sm font-medium', item.checked ? 'text-white/40 line-through' : 'text-white')}>
                      {item.name}
                    </span>
                    <span className="text-xs font-semibold text-white/50">{item.quantity}</span>
                  </button>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
