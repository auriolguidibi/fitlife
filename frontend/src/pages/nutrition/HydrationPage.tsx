import { useState } from 'react'
import { Droplets } from 'lucide-react'
import type { WaterLog } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Button, Card, ProgressRing, Spinner } from '@/components/ui'
import { todayKey } from '@/utils/id'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

export function HydrationPage() {
  const date = todayKey()
  const { data, loading } = useAsync(async () => {
    const [water, plan] = await Promise.all([api.getWaterLog(date), api.getNutritionPlan()])
    return { water, targetMl: plan.hydrationTarget * 1000 }
  }, [date])
  const [water, setWater] = useState<WaterLog | null>(null)
  const [busy, setBusy] = useState(false)

  if (loading || !data) return <Spinner label="Chargement de ton hydratation…" />

  const current = water ?? data.water
  const target = data.targetMl
  const pct = Math.min(100, Math.round((current.ml / target) * 100))

  const add = async (ml: number) => {
    if (current.ml + ml < 0) return
    setBusy(true)
    try {
      setWater(await api.addWater(ml))
    } finally {
      setBusy(false)
    }
  }

  const glasses = Math.floor(current.ml / 250)

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHero
        back="/nutrition"
        eyebrow="Nutrition"
        title="Hydratation"
        subtitle={`Objectif : ${(target / 1000).toString().replace('.', ',')} L / jour. Ton corps te dira merci.`}
        image={pageHeroes.hydration}
        imagePosition="60% 30%"
      />

      <Card variant="gradient" className="flex flex-col items-center py-6">
        <ProgressRing value={current.ml} max={target} size={180} stroke={14}>
          <div className="text-center">
            <Droplets className="mx-auto text-sky-400" size={26} />
            <p className="mt-1 text-3xl font-extrabold text-white">
              {(current.ml / 1000).toLocaleString('fr-FR', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-white/50">/ {(target / 1000).toString().replace('.', ',')} L</p>
          </div>
        </ProgressRing>
        <p className="mt-4 text-sm font-semibold text-fit">{pct}% de ton objectif</p>
        <p className="mt-1 text-xs text-white/50">≈ {glasses} verre(s) de 250 ml</p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <Button size="lg" onClick={() => add(250)} loading={busy} leftIcon={<Droplets size={18} />}>
          +250 ml
        </Button>
        <Button size="lg" variant="secondary" onClick={() => add(500)} loading={busy} leftIcon={<Droplets size={18} />}>
          +500 ml
        </Button>
      </div>
      <Button variant="ghost" fullWidth onClick={() => add(-250)} disabled={current.ml <= 0}>
        Retirer 250 ml
      </Button>

      <Card variant="glass" className="text-sm text-white/60">
        <p className="font-semibold text-white">Pourquoi bien s’hydrater ?</p>
        <p className="mt-1">
          L’eau participe à la récupération, à la concentration et au bon fonctionnement de ton
          métabolisme. Bois régulièrement, même sans soif.
        </p>
      </Card>
    </div>
  )
}
