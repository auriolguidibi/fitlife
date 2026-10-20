import { DownloadAppButton } from '@/components/domain/DownloadApp'
import { NotificationBell } from '@/components/domain/NotificationCenter'
import { useUnreadNotifications } from '@/hooks/useNotifications'
import { NavLink } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Crown, LifeBuoy, Lock, LogOut, Shield, ShieldAlert, ShieldCheck } from 'lucide-react'
import { premiumRoutes } from '@/data/plans'
import { sidebarSections } from '@/config/nav'
import { useAuth } from '@/context/AuthContext'
import { Avatar } from '@/components/ui'
import { pageHeroes } from '@/data/images'
import { Logo } from './Logo'
import { cn } from '@/utils/cn'
import { isAdmin, isStaff, isSuperAdmin } from '@/utils/roles'

function SideLink({
  to,
  label,
  icon: Icon,
  end,
  locked,
}: {
  to: string
  label: string
  icon: LucideIcon
  end?: boolean
  locked?: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'group relative flex items-center gap-3 rounded-2xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
          isActive
            ? 'bg-gradient-to-r from-fit/20 to-fit/[0.03] text-white'
            : 'text-white/55 hover:bg-white/[0.04] hover:text-white',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && (
            <span className="absolute -left-4 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-fit shadow-[0_0_12px_rgba(34,197,94,0.8)]" />
          )}
          <span
            className={cn(
              'grid h-8 w-8 place-items-center rounded-xl transition',
              isActive ? 'bg-fit text-white shadow-fit' : 'bg-white/[0.04] text-white/60 group-hover:text-white',
            )}
          >
            <Icon size={16} />
          </span>
          <span className="flex-1">{label}</span>
          {locked && <Lock size={13} className="text-amber-300/70" aria-label="Premium" />}
        </>
      )}
    </NavLink>
  )
}

export function Sidebar() {
  const { user, logout } = useAuth()
  const staff = isStaff(user)
  const hasPremium = !!user?.isPremium || staff
  const unread = useUnreadNotifications()

  return (
    <aside className="hidden lg:flex lg:w-72 lg:shrink-0 lg:flex-col">
      <div className="sticky top-0 flex h-screen flex-col gap-5 overflow-y-auto border-r border-white/[0.06] bg-gradient-to-b from-ink-800/90 to-ink-900 px-4 py-6 no-scrollbar">
        <div className="flex items-center justify-between px-2">
          <Logo />
          <NotificationBell unread={unread} />
        </div>

        {staff && (
          <NavLink
            to="/gestion"
            className={({ isActive }) =>
              cn(
                'group flex items-center gap-3 rounded-2xl border p-3 transition',
                isActive
                  ? 'border-fit bg-gradient-to-r from-fit to-fit-dark text-white shadow-fit'
                  : 'border-fit/30 bg-gradient-to-r from-fit/20 to-fit/5 text-white hover:border-fit/60',
              )
            }
          >
            {({ isActive }) => (
              <>
                <span className={cn('grid h-10 w-10 place-items-center rounded-xl', isActive ? 'bg-ink-900/15' : 'bg-fit text-white')}>
                  <ShieldCheck size={20} />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-bold">Espace Gestion</span>
                  <span className={cn('block text-[11px]', isActive ? 'text-ink-900/70' : 'text-white/55')}>
                    Lives, événements, menus, annonces
                  </span>
                </span>
                <ArrowRight size={16} className="transition group-hover:translate-x-0.5" />
              </>
            )}
          </NavLink>
        )}

        <nav className="flex-1 space-y-6 overflow-y-auto no-scrollbar">
          {sidebarSections.map((section) => (
            <div key={section.title}>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">
                {section.title}
              </p>
              <div className="space-y-1">
                {section.items.map((item) => (
                  <SideLink
                    key={`${section.title}-${item.to}-${item.label}`}
                    {...item}
                    locked={!hasPremium && item.to in premiumRoutes}
                  />
                ))}
              </div>
            </div>
          ))}

          {isAdmin(user) && (
            <div>
              <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/30">Administration</p>
              <div className="space-y-1">
                {isSuperAdmin(user) && <SideLink to="/super-admin" label="Espace Super admin" icon={ShieldAlert} />}
                <SideLink to="/admin" label="Statistiques & validation" icon={Shield} />
              </div>
            </div>
          )}
        </nav>

        <DownloadAppButton variant="card" />

        {!hasPremium && (
          <NavLink
            to="/premium"
            className="group relative isolate overflow-hidden rounded-3xl border border-amber-400/25 p-4"
          >
            <img
              src={pageHeroes.premium}
              alt=""
              className="absolute inset-0 -z-10 h-full w-full object-cover opacity-50 transition duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 -z-10 bg-gradient-to-t from-ink-900 via-ink-900/80 to-amber-900/30" />
            <span className="grid h-9 w-9 place-items-center rounded-xl bg-amber-400 text-ink-900">
              <Crown size={18} />
            </span>
            <p className="mt-3 font-display text-sm font-bold text-white">Passe Premium</p>
            <p className="mt-0.5 text-xs text-white/60">Lives exclusifs, Coach IA et suivi complet.</p>
            <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold text-amber-300">
              Découvrir <ArrowRight size={13} className="transition group-hover:translate-x-1" />
            </span>
          </NavLink>
        )}

        <div className="flex items-center gap-3 rounded-2xl border border-white/[0.06] bg-ink-700/60 p-3">
          <NavLink to="/profile">
            <Avatar name={`${user?.firstName ?? ''} ${user?.lastName ?? ''}`} src={user?.avatarUrl} size="sm" online />
          </NavLink>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="truncate text-xs text-white/40">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="grid h-8 w-8 place-items-center rounded-full text-white/50 transition hover:bg-red-500/10 hover:text-red-300"
            title="Déconnexion"
          >
            <LogOut size={16} />
          </button>
        </div>
        <NavLink to="/help" className="flex items-center gap-2 px-3 text-xs text-white/40 hover:text-white">
          <LifeBuoy size={14} /> Aide & support
        </NavLink>
      </div>
    </aside>
  )
}
