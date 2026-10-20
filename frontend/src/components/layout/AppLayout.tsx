import { Outlet, useLocation } from 'react-router-dom'
import { Suspense, useEffect } from 'react'
import { Spinner } from '@/components/ui'
import { Sidebar } from './Sidebar'
import { MobileHeader } from './MobileHeader'
import { BottomNavigation } from './BottomNavigation'
import { ActiveSessionBanner } from '@/components/domain/ActiveSessionBanner'
import { LiveAlert } from '@/components/domain/LiveAlert'

export function AppLayout() {
  const { pathname } = useLocation()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="relative flex min-h-screen bg-ink-900">
      {/* Halo d'ambiance discret en fond */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="aurora -right-40 -top-40 h-[30rem] w-[30rem] bg-fit/[0.12]" />
        <div className="aurora aurora-2 -bottom-48 left-1/3 h-[26rem] w-[26rem] bg-emerald-800/20" />
      </div>
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col">
        <MobileHeader />
        <main
          key={pathname}
          className="animate-fade-in mx-auto w-full max-w-3xl flex-1 px-4 pb-32 pt-4 lg:max-w-5xl lg:px-8 lg:pb-12 lg:pt-8"
        >
          <Suspense fallback={<Spinner />}>
            <Outlet />
          </Suspense>
        </main>
        <ActiveSessionBanner />
        <LiveAlert />
        <BottomNavigation />
      </div>
    </div>
  )
}
