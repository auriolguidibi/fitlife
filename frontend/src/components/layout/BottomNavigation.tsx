import { NavLink } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import type { NavItem } from '@/config/nav'
import { primaryNav } from '@/config/nav'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'
import { isStaff } from '@/utils/roles'

function Tab({ to, label, icon: Icon, end }: NavItem) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          'relative flex flex-1 flex-col items-center gap-1 rounded-2xl py-2 text-[10px] font-semibold transition-all duration-300',
          isActive ? 'text-fit' : 'text-white/45 hover:text-white/80',
        )
      }
    >
      {({ isActive }) => (
        <>
          {isActive && <span className="absolute inset-0 rounded-2xl bg-gradient-to-b from-fit/20 to-fit/5" />}
          <Icon size={21} strokeWidth={isActive ? 2.5 : 2} className="relative" />
          <span className="relative">{label}</span>
          {isActive && (
            <span className="absolute -bottom-0.5 h-1 w-1 rounded-full bg-fit shadow-[0_0_8px_rgba(34,197,94,0.9)]" />
          )}
        </>
      )}
    </NavLink>
  )
}

export function BottomNavigation() {
  const { user } = useAuth()
  const staff = isStaff(user)
  // Coachs / admins : « Gestion » prend la place centrale, en bouton surélevé.
  const items = staff ? primaryNav.filter((i) => i.to !== '/progress') : primaryNav
  const half = Math.ceil(items.length / 2)

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-3 safe-bottom lg:hidden">
      <div className="mx-auto flex max-w-lg items-center justify-around rounded-[1.75rem] border border-white/10 bg-ink-800/85 px-1.5 py-1.5 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.9)] backdrop-blur-2xl">
        {(staff ? items.slice(0, half) : items).map((item) => (
          <Tab key={item.to} {...item} />
        ))}
        {staff && (
          <>
            <NavLink to="/gestion" className="relative -mt-8 flex flex-1 flex-col items-center gap-1" aria-label="Espace Gestion">
              {({ isActive }) => (
                <>
                  <span
                    className={cn(
                      'grid h-14 w-14 place-items-center rounded-full border-4 border-ink-900 bg-gradient-to-br from-fit to-fit-dark text-white shadow-[0_10px_30px_-6px_rgba(34,197,94,0.8)] transition',
                      isActive && 'ring-2 ring-fit-light ring-offset-2 ring-offset-ink-900',
                    )}
                  >
                    <ShieldCheck size={24} strokeWidth={2.4} />
                  </span>
                  <span className={cn('text-[10px] font-bold', isActive ? 'text-fit' : 'text-white/80')}>Gestion</span>
                </>
              )}
            </NavLink>
            {items.slice(half).map((item) => (
              <Tab key={item.to} {...item} />
            ))}
          </>
        )}
      </div>
    </nav>
  )
}
