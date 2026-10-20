import { useEffect, useRef, useState } from 'react'
import { Loader2, Mic, MicOff, Settings, Square, Video, VideoOff, WifiOff } from 'lucide-react'
import type { LiveSession } from '@/types'
import { api } from '@/services'
import { Button } from '@/components/ui'
import { CameraError, LiveHost, LiveViewer, openAppSettings, openCamera } from '@/utils/liveRtc'
import type { ViewerState } from '@/utils/liveRtc'
import { cn } from '@/utils/cn'

function ControlButton({
  on,
  onClick,
  iconOn,
  iconOff,
  label,
}: {
  on: boolean
  onClick: () => void
  iconOn: React.ReactNode
  iconOff: React.ReactNode
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      aria-label={label}
      title={label}
      className={cn(
        'grid h-12 w-12 place-items-center rounded-full border backdrop-blur-md transition sm:h-14 sm:w-14',
        on ? 'border-white/20 bg-white/15 text-white hover:bg-white/25' : 'border-red-400/50 bg-red-500 text-white hover:bg-red-600',
      )}
    >
      {on ? iconOn : iconOff}
    </button>
  )
}

/** Studio de l'hôte : sa caméra en direct, avec caméra / micro activables à tout moment. */
export function HostStudio({
  live,
  onLive,
  onEnd,
  autoStart,
}: {
  live: LiveSession
  onLive: (live: LiveSession) => void
  onEnd: () => void
  autoStart?: boolean
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const hostRef = useRef<LiveHost | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [cameraOn, setCameraOn] = useState(true)
  const [micOn, setMicOn] = useState(true)
  const [viewers, setViewers] = useState(0)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [blocked, setBlocked] = useState(false)

  const start = async () => {
    setError('')
    setBlocked(false)
    setBusy(true)
    try {
      const media = await openCamera()
      streamRef.current = media
      setStream(media)
      setCameraOn(true)
      setMicOn(true)
      hostRef.current?.stop()
      hostRef.current = new LiveHost(live.id, media, setViewers)
      onLive(await api.setLiveBroadcast(live.id, { cameraOn: true, micOn: true }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Impossible d’ouvrir la caméra.')
      setBlocked(err instanceof CameraError && err.blocked)
    } finally {
      setBusy(false)
    }
  }

  // Démarrage automatique après « Passer en direct ».
  useEffect(() => {
    if (autoStart && !streamRef.current) void start()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoStart])

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  // En quittant la page : caméra éteinte et connexions fermées.
  useEffect(
    () => () => {
      hostRef.current?.stop()
      streamRef.current?.getTracks().forEach((t) => t.stop())
      if (streamRef.current) api.setLiveBroadcast(live.id, { cameraOn: false, micOn: false }).catch(() => undefined)
    },
    [live.id],
  )

  const toggleCamera = async () => {
    const next = !cameraOn
    streamRef.current?.getVideoTracks().forEach((t) => (t.enabled = next))
    setCameraOn(next)
    onLive(await api.setLiveBroadcast(live.id, { cameraOn: next, micOn }).catch(() => live))
  }

  const toggleMic = async () => {
    const next = !micOn
    streamRef.current?.getAudioTracks().forEach((t) => (t.enabled = next))
    setMicOn(next)
    await api.setLiveBroadcast(live.id, { cameraOn, micOn: next }).catch(() => undefined)
  }

  const end = () => {
    hostRef.current?.stop()
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
    setStream(null)
    onEnd()
  }

  return (
    <div className="relative aspect-[3/4] w-full sm:aspect-video">
      {stream ? (
        <>
          <video ref={videoRef} autoPlay playsInline muted className={cn('absolute inset-0 h-full w-full -scale-x-100 object-cover', !cameraOn && 'opacity-0')} />
          {!cameraOn && (
            <div className="absolute inset-0 grid place-items-center bg-ink-900">
              <div className="text-center">
                <VideoOff size={34} className="mx-auto text-white/50" />
                <p className="mt-2 text-sm font-semibold text-white/70">Caméra coupée</p>
                <p className="text-xs text-white/40">Les membres voient « caméra coupée » et t’entendent toujours.</p>
              </div>
            </div>
          )}
          <span className="pointer-events-none absolute bottom-24 left-3 rounded-full bg-ink-900/75 px-3 py-1 text-[11px] font-semibold text-white backdrop-blur sm:bottom-24">
            {viewers} spectateur{viewers > 1 ? 's' : ''} connecté{viewers > 1 ? 's' : ''}
          </span>
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-center gap-3 bg-gradient-to-t from-black/80 to-transparent px-4 pb-4 pt-10">
            <ControlButton on={cameraOn} onClick={toggleCamera} iconOn={<Video size={20} />} iconOff={<VideoOff size={20} />} label={cameraOn ? 'Couper la caméra' : 'Activer la caméra'} />
            <ControlButton on={micOn} onClick={toggleMic} iconOn={<Mic size={20} />} iconOff={<MicOff size={20} />} label={micOn ? 'Couper le micro' : 'Activer le micro'} />
            <button
              type="button"
              onClick={end}
              className="inline-flex h-12 items-center gap-2 rounded-full bg-red-500 px-5 text-sm font-bold text-white transition hover:bg-red-600 sm:h-14"
            >
              <Square size={16} fill="currentColor" /> Terminer
            </button>
          </div>
        </>
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-ink-800 to-black px-6">
          <div className="max-w-sm text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-fit/15 text-fit">
              <Video size={28} />
            </span>
            <p className="mt-3 font-display text-lg font-bold text-white">Tu es en direct</p>
            <p className="mt-1 text-sm text-white/55">Allume ta caméra : les membres te voient dès qu’ils rejoignent la salle.</p>
            {error && <p className="mt-3 rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</p>}
            {blocked && (
              <Button variant="secondary" size="sm" className="mt-2" onClick={openAppSettings} leftIcon={<Settings size={14} />}>
                Ouvrir les réglages
              </Button>
            )}
            <div className="mt-4 flex flex-col justify-center gap-2 sm:flex-row">
              <Button onClick={start} loading={busy} leftIcon={<Video size={16} />}>
                {error ? 'Réessayer' : 'Activer ma caméra'}
              </Button>
              <Button variant="danger" onClick={end} leftIcon={<Square size={14} />}>
                Terminer le live
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/** Vue spectateur : la caméra de l'hôte en direct. */
export function ViewerStream({ live }: { live: LiveSession }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [state, setState] = useState<ViewerState>('connecting')
  const [muted, setMuted] = useState(true)

  useEffect(() => {
    if (!live.hostUserId) return
    const viewer = new LiveViewer(live.id, live.hostUserId, setStream, setState)
    return () => viewer.stop()
  }, [live.id, live.hostUserId])

  useEffect(() => {
    if (videoRef.current && stream) videoRef.current.srcObject = stream
  }, [stream])

  const cameraOff = live.cameraOn === false

  return (
    <div className="relative aspect-video w-full bg-black">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted={muted}
        className={cn('absolute inset-0 h-full w-full object-contain', (cameraOff || !stream) && 'opacity-0')}
      />
      {(cameraOff || !stream || state !== 'connected') && (
        <div className="absolute inset-0 grid place-items-center bg-gradient-to-br from-ink-800 to-black px-6 text-center">
          {cameraOff ? (
            <div>
              <VideoOff size={32} className="mx-auto text-white/50" />
              <p className="mt-2 text-sm font-semibold text-white/75">Le coach a coupé sa caméra</p>
              <p className="text-xs text-white/45">Elle revient dans un instant, reste connecté.</p>
            </div>
          ) : state === 'failed' ? (
            <div>
              <WifiOff size={30} className="mx-auto text-white/50" />
              <p className="mt-2 text-sm font-semibold text-white/75">Connexion au direct difficile</p>
              <p className="text-xs text-white/45">Nouvelle tentative automatique… Vérifie ta connexion internet.</p>
            </div>
          ) : (
            <div>
              <Loader2 size={30} className="mx-auto animate-spin text-fit" />
              <p className="mt-2 text-sm font-semibold text-white/75">Connexion au direct…</p>
            </div>
          )}
        </div>
      )}
      {stream && state === 'connected' && (
        <button
          type="button"
          onClick={() => setMuted((m) => !m)}
          aria-pressed={!muted}
          className={cn(
            'absolute bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-2 rounded-full px-4 py-2 text-xs font-bold text-white',
            muted ? 'bg-fit shadow-fit' : 'border border-white/15 bg-ink-900/75 backdrop-blur',
          )}
        >
          {muted ? <Mic size={14} /> : <MicOff size={14} />} {muted ? 'Activer le son' : 'Couper le son'}
        </button>
      )}
    </div>
  )
}
