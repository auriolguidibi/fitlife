import type { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Check, Crown, Lock, Minus } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { Button } from '@/components/ui'
import { PageHero } from '@/components/layout/PageHero'
import { offerComparison, planById, premiumRoutes } from '@/data/plans'
import { pageHeroes } from '@/data/images'
import { formatCurrency } from '@/utils/format'
import { isStaff } from '@/utils/roles'
import { PromoRedeem } from './PromoRedeem'

/** Réserve une page aux membres Premium (les coachs et admins y ont toujours accès). */
export function PremiumGate({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const { pathname } = useLocation()
  if (user?.isPremium || isStaff(user)) return <>{children}</>

  const feature = premiumRoutes[pathname] ?? 'Cette fonctionnalité'
  const row = offerComparison.find((r) => r.feature === feature)
  const plan = planById('premium')

  return (
    <div className="space-y-5">
      <PageHero
        eyebrow="Réservé aux membres Premium"
        title={feature}
        subtitle={row ? row.premium : 'Passe Premium pour débloquer tout FitLife.'}
        icon={<Lock size={22} />}
        image={pageHeroes.premium}
      />

      <div className="surface rounded-3xl p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-white/40">Gratuit</p>
            <p className="mt-2 flex items-start gap-2 text-sm text-white/60">
              <Minus size={16} className="mt-0.5 shrink-0 text-red-300" />
              {row?.free ?? 'Non disponible'}
            </p>
          </div>
          <div className="rounded-2xl border border-amber-400/30 bg-amber-400/[0.07] p-4">
            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">Premium</p>
            <p className="mt-2 flex items-start gap-2 text-sm text-white/85">
              <Check size={16} className="mt-0.5 shrink-0 text-fit" />
              {row?.premium ?? 'Accès complet'}
            </p>
          </div>
        </div>

        <ul className="mt-5 grid gap-2 sm:grid-cols-2">
          {plan.features.slice(0, 6).map((f) => (
            <li key={f} className="flex items-start gap-2 text-sm text-white/70">
              <Check size={15} className="mt-0.5 shrink-0 text-fit" /> {f}
            </li>
          ))}
        </ul>

        <div className="mt-6 flex flex-col items-center gap-3 sm:flex-row sm:justify-between">
          <p className="text-sm text-white/60">
            À partir de <span className="font-display text-xl font-extrabold text-white">{formatCurrency(plan.priceMonthly)}</span> / mois
          </p>
          <Link to="/premium" className="w-full sm:w-auto">
            <Button variant="premium" size="lg" fullWidth leftIcon={<Crown size={18} />}>
              Débloquer avec Premium
            </Button>
          </Link>
        </div>
      </div>

      {/* Un code promo donné par un coach ou un admin débloque la page immédiatement. */}
      <PromoRedeem />
    </div>
  )
}
