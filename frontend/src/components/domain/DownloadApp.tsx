import { useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { Capacitor } from '@capacitor/core'
import qrcode from 'qrcode-generator'
import { Apple, Download, ShieldCheck, Smartphone } from 'lucide-react'
import { Button, Modal } from '@/components/ui'
import { cn } from '@/utils/cn'

/**
 * Lien de téléchargement de l'application Android : le fichier est servi par le site lui-même
 * (frontend/public/FitLife.apk, remplacé automatiquement à chaque nouvelle version).
 * Remplaçable par VITE_APK_URL.
 */
export const APK_URL = import.meta.env.VITE_APK_URL || `${window.location.origin}${import.meta.env.BASE_URL}FitLife.apk`

type Platform = 'android' | 'ios' | 'desktop'

function detectPlatform(): Platform {
  const ua = navigator.userAgent || ''
  if (/android/i.test(ua)) return 'android'
  if (/iphone|ipad|ipod/i.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) return 'ios'
  return 'desktop'
}

/**
 * Le bouton n'a de sens que sur le site web : celui qui a déjà l'application ne le voit jamais.
 * - version APK compilée avec VITE_TARGET=app ;
 * - application native détectée à l'exécution (Capacitor, WebView Android) ;
 * - site ajouté à l'écran d'accueil (mode application).
 */
export const isWebVersion = () => {
  if (import.meta.env.VITE_TARGET === 'app' || Capacitor.isNativePlatform()) return false
  if (typeof window === 'undefined') return true
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor
  if (cap?.isNativePlatform?.()) return false
  if (/; wv\)/.test(navigator.userAgent)) return false
  if (window.matchMedia?.('(display-mode: standalone)').matches) return false
  return true
}

function QrCode({ value, size = 184 }: { value: string; size?: number }) {
  const src = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(value)
    qr.make()
    return qr.createDataURL(8, 2)
  }, [value])
  return <img src={src} alt="QR code de téléchargement" width={size} height={size} className="rounded-2xl bg-white p-2" style={{ imageRendering: 'pixelated' }} />
}

const steps = [
  'Touche « Télécharger » : le fichier FitLife.apk arrive dans tes téléchargements.',
  'Ouvre-le. Si Android le demande, autorise « Installer des applications inconnues ».',
  'Touche « Installer », puis ouvre FitLife et connecte-toi.',
]

export function DownloadAppModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const platform = useMemo(detectPlatform, [])

  return (
    <Modal open={open} onClose={onClose} title="Installer FitLife sur ton téléphone">
      <div className="space-y-5">
        <div className="flex items-center gap-3 rounded-2xl border border-fit/25 bg-fit/10 p-3">
          <img src={`${import.meta.env.BASE_URL}brand/app-icon-512.png`} alt="" className="h-14 w-14 shrink-0 rounded-2xl" />
          <div className="min-w-0">
            <p className="font-display text-base font-bold text-white">FitLife pour Android</p>
            <p className="text-xs text-white/55">Gratuit · environ 8 Mo · Android 6 ou plus récent</p>
          </div>
        </div>

        {platform === 'ios' ? (
          <div className="space-y-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
            <p className="flex items-center gap-2 text-sm font-bold text-white">
              <Apple size={16} /> Tu es sur iPhone
            </p>
            <p className="text-sm text-white/65">
              L’application est pour l’instant disponible sur Android. Sur iPhone, utilise FitLife directement ici, dans le
              navigateur : touche <b>Partager</b> puis <b>« Sur l’écran d’accueil »</b> pour l’avoir comme une app.
            </p>
          </div>
        ) : (
          <>
            {platform === 'desktop' && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-center sm:flex-row sm:text-left">
                <QrCode value={APK_URL} />
                <div className="space-y-1.5">
                  <p className="flex items-center justify-center gap-2 text-sm font-bold text-white sm:justify-start">
                    <Smartphone size={16} className="text-fit" /> Scanne avec ton téléphone
                  </p>
                  <p className="text-xs text-white/55">
                    Ouvre l’appareil photo de ton téléphone Android et vise ce code : le téléchargement démarre directement.
                  </p>
                </div>
              </div>
            )}
            <ol className="space-y-2.5">
              {steps.map((s, i) => (
                <li key={s} className="flex gap-3 text-sm text-white/70">
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-fit/15 text-xs font-bold text-fit">{i + 1}</span>
                  {s}
                </li>
              ))}
            </ol>
            <a href={APK_URL} download="FitLife.apk" rel="noopener" className="block">
              <Button size="lg" fullWidth leftIcon={<Download size={18} />}>
                {platform === 'desktop' ? 'Télécharger le fichier APK' : 'Télécharger FitLife'}
              </Button>
            </a>
          </>
        )}

        <p className="flex items-center gap-2 text-[11px] text-white/40">
          <ShieldCheck size={13} className="shrink-0 text-fit/70" />
          Ton compte reste le même : connecte-toi dans l’application avec ton e-mail et ton mot de passe habituels.
        </p>
      </div>
    </Modal>
  )
}

/** Bouton « Télécharger l'application » : invisible dans l'application installée. */
export function DownloadAppButton({
  variant = 'button',
  className,
}: {
  variant?: 'button' | 'card' | 'icon' | 'link'
  className?: string
}) {
  const [open, setOpen] = useState(false)
  if (!isWebVersion()) return null

  const trigger =
    variant === 'icon' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Télécharger l’application"
        title="Télécharger l’application"
        className={cn('grid h-10 w-10 place-items-center rounded-full border border-fit/30 bg-fit/10 text-fit transition hover:bg-fit/20', className)}
      >
        <Download size={17} />
      </button>
    ) : variant === 'card' ? (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          'group flex w-full items-center gap-3 rounded-3xl border border-fit/25 bg-gradient-to-r from-fit/15 to-fit/5 p-3.5 text-left transition hover:border-fit/50',
          className,
        )}
      >
        <img src={`${import.meta.env.BASE_URL}brand/app-icon-512.png`} alt="" className="h-11 w-11 shrink-0 rounded-xl" />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-bold text-white">Télécharger l’application</span>
          <span className="block truncate text-[11px] text-white/55">FitLife sur ton téléphone Android</span>
        </span>
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-fit text-white transition group-hover:scale-110">
          <Download size={16} />
        </span>
      </button>
    ) : variant === 'link' ? (
      <button type="button" onClick={() => setOpen(true)} className={cn('inline-flex items-center gap-1.5 font-semibold text-fit hover:underline', className)}>
        <Download size={14} /> Télécharger l’application
      </button>
    ) : (
      <Button variant="secondary" onClick={() => setOpen(true)} leftIcon={<Download size={16} />} className={className}>
        Télécharger l’application
      </Button>
    )

  return (
    <>
      {trigger}
      {/* Rendu à la racine de la page : sinon l'en-tête flouté ou les colonnes le masquent. */}
      {open && createPortal(<DownloadAppModal open onClose={() => setOpen(false)} />, document.body)}
    </>
  )
}
