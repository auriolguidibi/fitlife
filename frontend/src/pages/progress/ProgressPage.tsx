import { useState } from 'react'
import type { ReactNode } from 'react'
import { Droplets, Footprints, MapPin, Scale, TrendingUp, Weight } from 'lucide-react'
import type { ProgressRange } from '@/types'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { Card, Spinner, StatCard, Tabs } from '@/components/ui'
import { LineChart, BarChart } from '@/components/ui/Chart'
import { Button, Modal, Input } from '@/components/ui'
import { formatKm, formatNumber } from '@/utils/format'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

export function ProgressPage() {
  const [range, setRange] = useState<ProgressRange>('30d')
  const [weightOpen, setWeightOpen] = useState(false)
  const [weight, setWeight] = useState('')
  const { data, loading, reload } = useAsync(() => api.getProgress(range), [range])

  const saveWeight = async () => {
    const v = Number(weight.replace(',', '.'))
    if (v > 0) {
      await api.addWeight(v)
      setWeightOpen(false)
      setWeight('')
      reload()
    }
  }

  if (loading || !data) return <Spinner label="Calcul de ta progression…" />

  const weightDelta = data.weightStart - data.weightEnd
  const points = data.points

  const weightData = points
    .filter((p) => typeof p.weight === 'number')
    .map((p) => ({ label: shortDate(p.date), poids: p.weight ?? 0 }))
  const distanceData = points.map((p) => ({ label: shortDate(p.date), distance: p.distanceKm ?? 0 }))
  const sessionsData = points.map((p) => ({ label: shortDate(p.date), sessions: p.sessions ?? 0 }))
  const caloriesData = points.map((p) => ({ label: shortDate(p.date), calories: p.calories ?? 0 }))
  const waterData = points.map((p) => ({ label: shortDate(p.date), eau: Math.round((p.waterMl ?? 0) / 100) / 10 }))
  const stepsData = points.map((p) => ({ label: shortDate(p.date), pas: p.steps ?? 0 }))

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Ton évolution"
        title="Ma progression"
        subtitle="Calculée à partir de tes données réelles. Les petits pas font les grands changements."
        icon={<TrendingUp size={22} />}
        image={pageHeroes.progress}
        actions={
          <Button size="sm" variant="secondary" onClick={() => setWeightOpen(true)} leftIcon={<Scale size={15} />}>
            Poids
          </Button>
        }
      />

      <Tabs
        value={range}
        onChange={setRange}
        tabs={[
          { value: '7d', label: '7 j' },
          { value: '30d', label: '30 j' },
          { value: '3m', label: '3 mois' },
          { value: '6m', label: '6 mois' },
          { value: '1y', label: '1 an' },
        ]}
      />

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Poids"
          value={`${fr(data.weightStart)} → ${fr(data.weightEnd)}`}
          trend={{ value: weightDelta > 0 ? `-${fr(weightDelta)} kg` : `+${fr(Math.abs(weightDelta))} kg`, positive: weightDelta >= 0 }}
          icon={<Weight size={14} />}
        />
        <StatCard label="Distance" value={formatKm(data.totalDistanceKm).replace(' km', '')} unit="km" icon={<MapPin size={14} />} />
        <StatCard label="Séances" value={data.totalSessions} unit={`/ ${range === '7d' ? 7 : range === '30d' ? 30 : 90}`} icon={<TrendingUp size={14} />} />
        <StatCard label="Pas totaux" value={formatNumber(data.totalSteps)} icon={<Footprints size={14} />} />
      </section>

      <ChartCard title="Évolution du poids" unit=" kg">
        <LineChart data={weightData} dataKey="poids" unit=" kg" color="#22C55E" />
      </ChartCard>

      <ChartCard title="Distance parcourue" unit=" km">
        <BarChart data={distanceData} dataKey="distance" unit=" km" />
      </ChartCard>

      <ChartCard title="Séances par période" unit="">
        <BarChart data={sessionsData} dataKey="sessions" color="#38BDF8" />
      </ChartCard>

      <ChartCard title="Calories" unit=" kcal">
        <LineChart data={caloriesData} dataKey="calories" unit=" kcal" color="#FBBF24" />
      </ChartCard>

      <ChartCard title="Hydratation (L)" unit=" L">
        <LineChart data={waterData} dataKey="eau" unit=" L" color="#38BDF8" />
      </ChartCard>

      <ChartCard title="Pas" unit="">
        <BarChart data={stepsData} dataKey="pas" color="#4CC9FF" />
      </ChartCard>

      <Modal open={weightOpen} onClose={() => setWeightOpen(false)} title="Enregistrer mon poids">
        <Input
          label="Poids (kg)"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder={`Actuel : ${fr(data.weightEnd)}`}
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setWeightOpen(false)}>Annuler</Button>
          <Button onClick={saveWeight} disabled={!Number(weight.replace(',', '.'))}>Enregistrer</Button>
        </div>
      </Modal>

      <Card variant="glass" className="flex items-start gap-3 text-sm">
        <Droplets className="mt-0.5 shrink-0 text-sky-400" size={18} />
        <p className="text-white/60">
          Moyenne d’hydratation sur la période :{' '}
          <span className="font-semibold text-white">{(data.avgWaterMl / 1000).toFixed(1).replace('.', ',')} L / jour</span>
        </p>
      </Card>
    </div>
  )
}

function ChartCard({ title, unit, children }: { title: string; unit?: string; children: ReactNode }) {
  return (
    <Card>
      <h3 className="mb-3 text-sm font-bold text-white">{title}</h3>
      {children}
      {unit && <p className="mt-1 text-right text-[10px] text-white/30">{unit}</p>}
    </Card>
  )
}

/** Nombre au format français (1 décimale max). */
function fr(n: number): string {
  return n.toLocaleString('fr-FR', { maximumFractionDigits: 1 })
}

function shortDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' })
}