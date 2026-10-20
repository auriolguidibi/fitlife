import { DownloadAppButton } from '@/components/domain/DownloadApp'
import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import { CheckCircle2, Footprints, MessageCircle, ShieldCheck, Ticket } from 'lucide-react'
import { Logo } from './Logo'
import { img } from '@/data/images'
import { versionLabel } from '@/utils/version'
import { cn } from '@/utils/cn'

const slides = [
  {
    photo: 'photo-1631899477678-9d3c5aeded2d',
    position: '50% 40%',
    title: (
      <>
        Plus qu’une appli, un vrai <span className="text-fit">accompagnement</span>.
      </>
    ),
    feature: 'Écris directement aux coachs FitLife et suis leurs lives en direct, caméra allumée.',
    label: 'Coachs & lives',
  },
  {
    photo: 'photo-1649888471945-b96947250299',
    position: '60% 30%',
    title: (
      <>
        Des séances qui s’adaptent à <span className="text-fit">ta vie</span>, pas l’inverse.
      </>
    ),
    feature: 'Un programme construit selon ton objectif, ton niveau, ton matériel et le temps dont tu disposes.',
    label: 'Programme personnalisé',
  },
  {
    photo: 'photo-1616803689943-5601631c7fec',
    position: '50% 50%',
    title: (
      <>
        Tes progrès, tes défis, ta <span className="text-fit">communauté</span>.
      </>
    ),
    feature: 'Tes vrais pas, comptés par le capteur de ton téléphone, tes parcours GPS, tes défis et ta progression.',
    label: 'Podomètre & défis',
  },
]

export function AuthLayout() {
  const { pathname } = useLocation()
  const [index, setIndex] = useState(0)
  const slide = slides[index]

  useEffect(() => {
    const t = window.setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000)
    return () => window.clearInterval(t)
  }, [])

  const showTabs = pathname === '/login' || pathname === '/register'

  return (
    <div className="relative min-h-screen overflow-hidden bg-ink-900 lg:grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
      {/* Fond animé */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="aurora -left-32 -top-32 h-[28rem] w-[28rem] bg-fit/30" />
        <div className="aurora aurora-2 bottom-[-10rem] left-1/4 h-[26rem] w-[26rem] bg-emerald-700/30" />
        <div className="auth-grid absolute inset-0" />
      </div>

      {/* Bandeau photo mobile */}
      <div
        className="relative h-64 overflow-hidden lg:hidden"
        style={{ maskImage: 'linear-gradient(to bottom, #000 55%, transparent)', WebkitMaskImage: 'linear-gradient(to bottom, #000 55%, transparent)' }}
      >
        {slides.map((s, i) => (
          <img
            key={s.photo}
            src={img(s.photo, 900, 640)}
            alt=""
            style={{ objectPosition: s.position }}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000',
              i === index ? 'kenburns opacity-100' : 'opacity-0',
            )}
          />
        ))}
        <div className="absolute inset-0 bg-gradient-to-b from-ink-900/50 via-transparent to-transparent" />
        <NavLink to="/" className="absolute left-5 top-6">
          <Logo size="md" />
        </NavLink>
      </div>

      {/* Colonne formulaire */}
      <div className="relative z-10">
        <div className="mx-auto flex min-h-[calc(100vh-15rem)] w-full max-w-[30rem] flex-col px-4 pb-8 sm:px-6 lg:min-h-screen lg:py-10">
          <NavLink to="/" className="hidden lg:block">
            <Logo size="md" />
          </NavLink>

          <div className="-mt-10 flex flex-1 flex-col justify-center lg:mt-0 lg:py-8">
            <div className="glow-card rise rounded-[2rem] p-6 shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] sm:p-8">
              {showTabs && (
                <div className="relative mb-7 grid grid-cols-2 rounded-2xl bg-ink-900/70 p-1 text-sm font-semibold">
                  <span
                    className={cn(
                      'absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-xl bg-fit shadow-fit transition-transform duration-500 ease-[cubic-bezier(.2,.8,.2,1)]',
                      pathname === '/register' && 'translate-x-full',
                    )}
                  />
                  {[
                    ['/login', 'Connexion'],
                    ['/register', 'Inscription'],
                  ].map(([to, label]) => (
                    <NavLink
                      key={to}
                      to={to}
                      className={({ isActive }) =>
                        cn(
                          'relative z-10 rounded-xl py-2.5 text-center transition-colors',
                          isActive ? 'text-ink-900' : 'text-white/55 hover:text-white',
                        )
                      }
                    >
                      {label}
                    </NavLink>
                  ))}
                </div>
              )}
              <div key={pathname} className="rise">
                <Outlet />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-center gap-5 text-[11px] text-white/35">
              <span className="inline-flex items-center gap-1.5">
                <ShieldCheck size={13} className="text-fit/70" /> Données protégées
              </span>
            </div>

            <DownloadAppButton variant="card" className="mt-5" />
          </div>

          <p className="mt-6 text-center text-xs text-white/25">Ton corps. Ton alimentation. Ton coach.</p>
          <p className="mt-1 text-center text-[10px] text-white/20">{versionLabel()}</p>
        </div>
      </div>

      {/* Visuel desktop */}
      <aside className="relative z-10 hidden p-4 lg:block">
        <div className="sticky top-4 h-[calc(100vh-2rem)] overflow-hidden rounded-[2rem] border border-white/10">
          {slides.map((s, i) => (
            <img
              key={s.photo}
              src={img(s.photo, 1400)}
              alt=""
              style={{ objectPosition: s.position }}
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-1000',
                i === index ? 'kenburns opacity-100' : 'opacity-0',
              )}
            />
          ))}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-900 via-ink-900/25 to-ink-900/30" />

          {/* Fonctionnalités réelles de l'application */}
          <div className="float-slow absolute right-8 top-10 inline-flex items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3 pr-4 backdrop-blur-md">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-fit/15 text-fit">
              <Footprints size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Vrai podomètre</p>
              <p className="text-[11px] text-white/55">capteur de pas du téléphone</p>
            </div>
          </div>

          <div className="float-slower absolute left-8 top-32 inline-flex [@media(max-height:760px)]:hidden items-center gap-3 rounded-2xl border border-white/10 bg-ink-900/60 p-3 pr-4 backdrop-blur-md">
            <span className="grid h-10 w-10 place-items-center rounded-xl bg-sky-400/15 text-sky-300">
              <MessageCircle size={18} />
            </span>
            <div>
              <p className="text-sm font-bold text-white">Écris à ton coach</p>
              <p className="text-[11px] text-white/55">réponse dans l’application</p>
            </div>
          </div>

          <div className="float-slow absolute right-16 top-56 inline-flex [@media(max-height:760px)]:hidden items-center gap-2.5 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-3.5 py-2.5 backdrop-blur-md">
            <Ticket size={18} className="text-amber-300" />
            <span className="text-xs font-semibold text-white">Code promo : Premium offert</span>
          </div>

          {/* Texte + fonctionnalité */}
          <div className="absolute inset-x-8 bottom-8 space-y-5">
            <h2 key={`t${index}`} className="rise max-w-lg text-4xl font-extrabold leading-tight text-white xl:text-5xl">
              {slide.title}
            </h2>

            <div
              key={`q${index}`}
              className="rise flex max-w-lg items-start gap-3 rounded-3xl border border-white/10 bg-ink-900/55 p-5 backdrop-blur-md"
              style={{ animationDelay: '120ms' }}
            >
              <CheckCircle2 size={20} className="mt-0.5 shrink-0 text-fit" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-fit">{slide.label}</p>
                <p className="mt-1 text-sm leading-relaxed text-white/85">{slide.feature}</p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {slides.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setIndex(i)}
                  aria-label={`Visuel ${i + 1}`}
                  className={cn(
                    'h-1.5 rounded-full transition-all duration-500',
                    i === index ? 'w-10 bg-fit' : 'w-4 bg-white/30 hover:bg-white/50',
                  )}
                />
              ))}
            </div>
          </div>
        </div>
      </aside>
    </div>
  )
}
