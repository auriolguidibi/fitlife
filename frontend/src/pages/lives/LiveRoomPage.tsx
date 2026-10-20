import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { HostStudio, ViewerStream } from './LiveStage'
import {
  ArrowLeft,
  CalendarClock,
  Crown,
  ExternalLink,
  Eye,
  Heart,
  HelpCircle,
  Lock,
  Play,
  Radio,
  Send,
  Video,
} from 'lucide-react'
import type { LiveMessage, LiveSession } from '@/types'
import { liveImage } from '@/data/images'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Avatar, Badge, Button, Card, EmptyState, Spinner } from '@/components/ui'
import { levelLabels } from '@/utils/labels'
import { formatDateTime, formatNumber, relativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { isStaff } from '@/utils/roles'

/** Identifiant YouTube (watch, youtu.be, live, embed, shorts), sinon null. */
function youTubeId(url?: string | null): string | null {
  if (!url) return null
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|live\/|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}

function countdown(iso: string): string {
  const ms = new Date(iso).getTime() - Date.now()
  if (ms <= 0) return 'imminent'
  const h = Math.floor(ms / 3600e3)
  const m = Math.floor((ms % 3600e3) / 60e3)
  if (h >= 24) return `dans ${Math.floor(h / 24)} j ${h % 24} h`
  return h > 0 ? `dans ${h} h ${String(m).padStart(2, '0')}` : `dans ${m} min`
}

export function LiveRoomPage() {
  const { id = '' } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { data: live, loading, error, reload, setData: setLive } = useAsync(() => api.getLive(id), [id])
  const { data: messages, reload: reloadMsg, setData: setMessages } = useAsync(() => api.getLiveMessages(id), [id])
  const [text, setText] = useState('')
  const [asQuestion, setAsQuestion] = useState(false)
  const [questionsOnly, setQuestionsOnly] = useState(false)
  const [liked, setLiked] = useState(false)
  const [sendError, setSendError] = useState('')
  const [searchParams] = useSearchParams()
  const [autoStudio, setAutoStudio] = useState(searchParams.get('studio') === '1')
  const [, tick] = useState(0)
  const chatRef = useRef<HTMLDivElement>(null)

  const staff = isStaff(user)
  const canChat = staff || !!user?.isPremium

  // Rafraîchissement silencieux pendant le direct (statut, spectateurs, messages).
  useEffect(() => {
    if (live?.status !== 'live') return
    const t = window.setInterval(() => {
      reload()
      reloadMsg()
    }, 4000)
    return () => window.clearInterval(t)
  }, [live?.status, reload, reloadMsg])

  // Compte à rebours d'un live programmé.
  useEffect(() => {
    if (live?.status !== 'scheduled') return
    const t = window.setInterval(() => tick((n) => n + 1), 30000)
    return () => window.clearInterval(t)
  }, [live?.status])

  // Défilement du chat uniquement (et pas de toute la page).
  useEffect(() => {
    const el = chatRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages?.length, questionsOnly])

  if (loading) return <Spinner label="Connexion au live…" />
  if (!live) {
    return (
      <div className="space-y-4 py-10">
        <EmptyState
          icon={<Play size={30} />}
          title="Live introuvable"
          description={error ?? 'Ce live a peut-être été supprimé.'}
          action={
            <Button variant="secondary" onClick={() => navigate('/lives')} leftIcon={<ArrowLeft size={16} />}>
              Voir les lives
            </Button>
          }
        />
      </div>
    )
  }

  if (live.premiumOnly && !user?.isPremium && !staff) {
    return (
      <div className="mx-auto max-w-md space-y-5 py-10 text-center">
        <div className="mx-auto grid h-20 w-20 place-items-center rounded-full bg-amber-400/15 text-amber-300">
          <Lock size={30} />
        </div>
        <h1 className="text-xl font-extrabold text-white">Live réservé au Premium</h1>
        <p className="text-sm text-white/55">
          « {live.title} » fait partie des lives Premium. Passe Premium pour y accéder et poser tes questions au coach.
        </p>
        <Button size="lg" fullWidth variant="premium" onClick={() => navigate('/premium')} leftIcon={<Crown size={18} />}>
          Devenir Premium
        </Button>
      </div>
    )
  }

  const isLive = live.status === 'live'
  const streamUrl = /^https?:\/\//i.test(live.streamUrl ?? '') ? live.streamUrl : null
  const ytId = youTubeId(streamUrl)
  const showVideo = !!ytId && live.status !== 'scheduled'
  const list = (messages ?? []).filter((m) => !questionsOnly || m.isQuestion)
  const questionCount = (messages ?? []).filter((m) => m.isQuestion).length

  const send = async () => {
    const value = text.trim()
    if (!value) return
    setSendError('')
    try {
      const msg = await api.sendLiveMessage(live.id, value, asQuestion)
      setMessages([...(messages ?? []), msg] as LiveMessage[])
      setText('')
      setAsQuestion(false)
    } catch (err) {
      setSendError(err instanceof Error ? err.message : 'Envoi impossible')
    }
  }

  const setStatus = async (status: LiveSession['status']) => {
    setLive(await api.setLiveStatus(live.id, status))
  }

  return (
    <div className="space-y-5">
      <button
        onClick={() => navigate('/lives')}
        className="inline-flex items-center gap-1.5 text-sm font-medium text-white/55 hover:text-white"
      >
        <ArrowLeft size={16} /> Tous les lives
      </button>

      {/* ---------- Vidéo / visuel ---------- */}
      <div className="relative overflow-hidden rounded-3xl border border-white/10 bg-black">
        {staff && isLive && (!live.hostUserId || live.hostUserId === user?.id) ? (
          <HostStudio live={live} onLive={setLive} onEnd={() => setStatus('ended')} autoStart={autoStudio} />
        ) : isLive && live.hostUserId && live.hostUserId !== user?.id ? (
          <ViewerStream live={live} />
        ) : showVideo ? (
          <div className="relative aspect-video w-full">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/${ytId}?autoplay=1&rel=0`}
              title={live.title}
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className="absolute inset-0 h-full w-full"
            />
          </div>
        ) : (
          <div className="relative grid aspect-video w-full place-items-center">
            <img
              src={liveImage(live.title, 1200)}
              alt={live.title}
              className={cn('absolute inset-0 h-full w-full object-cover', live.status === 'ended' && 'grayscale-[60%]')}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-ink-900/90 via-ink-900/30 to-ink-900/40" />
            <div className="relative px-6 text-center">
              {live.status === 'scheduled' ? (
                <>
                  <CalendarClock size={30} className="mx-auto text-white/80" />
                  {new Date(live.scheduledAt).getTime() > Date.now() ? (
                    <>
                      <p className="mt-2 font-display text-xl font-bold text-white">Commence {countdown(live.scheduledAt)}</p>
                      <p className="text-xs text-white/60">{formatDateTime(live.scheduledAt)}</p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 font-display text-xl font-bold text-white">En attente du coach</p>
                      <p className="text-xs text-white/60">Prévu le {formatDateTime(live.scheduledAt)}</p>
                    </>
                  )}
                </>
              ) : streamUrl && !isLive ? (
                <a href={streamUrl} target="_blank" rel="noopener noreferrer">
                  <Button size="lg" leftIcon={<ExternalLink size={18} />}>
                    Voir le replay
                  </Button>
                </a>
              ) : (
                <>
                  <span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-white/15 text-white backdrop-blur-md">
                    {isLive ? <Video size={26} /> : <Play size={26} fill="currentColor" className="ml-1" />}
                  </span>
                  <p className="mt-3 text-sm text-white/70">
                    {isLive ? 'Le coach allume sa caméra dans un instant…' : 'Ce live est terminé.'}
                  </p>
                </>
              )}
            </div>
          </div>
        )}
        {isLive && (
          <>
            <span className="pointer-events-none absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-red-500 px-3 py-1 text-xs font-bold text-white">
              <span className="h-2 w-2 animate-pulse rounded-full bg-white" /> EN DIRECT
            </span>
            <span className="pointer-events-none absolute right-3 top-3 z-10 inline-flex items-center gap-1 rounded-full bg-ink-900/80 px-3 py-1 text-xs font-semibold text-white">
              <Eye size={13} /> {formatNumber(live.viewers)}
            </span>
          </>
        )}
        {live.status === 'ended' && (
          <span className="pointer-events-none absolute left-3 top-3 rounded-full bg-ink-900/80 px-3 py-1 text-xs font-bold text-white/80">Terminé</span>
        )}
      </div>

      {/* ---------- Infos ---------- */}
      <div className="flex items-start gap-3">
        <Avatar name={live.coachName} src={live.coachAvatarUrl} size="lg" ring={isLive} online={isLive} />
        <div className="min-w-0 flex-1">
          <h1 className="text-xl font-extrabold text-white">{live.title}</h1>
          <p className="text-xs text-white/55">
            {live.coachName} · {levelLabels[live.level]} · {live.durationMinutes} min
          </p>
          {live.description && <p className="mt-1.5 text-sm text-white/60">{live.description}</p>}
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge tone={live.premiumOnly ? 'amber' : 'fit'}>{live.premiumOnly ? 'Premium' : 'Gratuit'}</Badge>
          <button
            onClick={() => setLiked(!liked)}
            className={cn(
              'inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-semibold transition',
              liked ? 'bg-red-500/20 text-red-300' : 'bg-white/[0.06] text-white/60 hover:text-white',
            )}
            aria-pressed={liked}
          >
            <Heart size={14} className={liked ? 'fill-red-400 text-red-400' : ''} /> J’aime
          </button>
        </div>
      </div>

      {/* ---------- Commandes coach / admin ---------- */}
      {staff && live.status === 'scheduled' && (
        <Card className="flex flex-col gap-3 border-fit/20 sm:flex-row sm:items-center">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-white">Prêt à commencer ?</p>
            <p className="text-xs text-white/55">Ta caméra s’allume et tous les membres reçoivent une notification. Aucun lien à partager.</p>
          </div>
          <Button
            onClick={async () => {
              await setStatus('live')
              setAutoStudio(true)
            }}
            leftIcon={<Radio size={16} />}
            className="bg-red-500 text-white shadow-none hover:bg-red-600"
          >
            Passer en direct
          </Button>
        </Card>
      )}

      {/* ---------- Chat ---------- */}
      <Card padding="none" className="flex h-[26rem] flex-col overflow-hidden">
        <div className="flex items-center justify-between gap-2 border-b border-white/[0.06] px-4 py-3">
          <p className="text-sm font-bold text-white">{isLive ? 'Chat en direct' : 'Messages du live'}</p>
          {questionCount > 0 && (
            <button
              onClick={() => setQuestionsOnly(!questionsOnly)}
              className={cn(
                'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition',
                questionsOnly ? 'bg-amber-400 text-ink-900' : 'bg-amber-400/15 text-amber-300',
              )}
            >
              <HelpCircle size={12} /> {questionCount} question{questionCount > 1 ? 's' : ''}
            </button>
          )}
        </div>

        <div ref={chatRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-3">
          {list.length === 0 && (
            <p className="py-8 text-center text-sm text-white/40">
              {questionsOnly ? 'Aucune question pour le moment.' : isLive ? 'Sois le premier à écrire !' : 'Aucun message.'}
            </p>
          )}
          {list.map((msg) => {
            const mine = msg.userId === user?.id
            return (
              <div key={msg.id} className={cn('flex gap-2', mine ? 'flex-row-reverse' : 'flex-row')}>
                <Avatar name={msg.userName} src={msg.avatarUrl} size="xs" />
                <div
                  className={cn(
                    'max-w-[78%] rounded-2xl px-3 py-2',
                    mine ? 'bg-fit text-white' : msg.isCoach ? 'border border-fit/30 bg-fit/10' : 'bg-ink-800',
                    msg.isQuestion && !mine && 'border border-amber-400/30',
                  )}
                >
                  <p className={cn('flex items-center gap-1.5 text-[10px] font-bold', mine ? 'text-ink-900/70' : 'text-fit')}>
                    {msg.userName}
                    {msg.isCoach && <span className="rounded bg-fit px-1 text-[9px] text-white">COACH</span>}
                    {msg.isQuestion && <span className="rounded bg-amber-400/25 px-1 text-[9px] text-amber-300">QUESTION</span>}
                  </p>
                  <p className="text-sm">{msg.text}</p>
                  <p className={cn('mt-0.5 text-[9px]', mine ? 'text-ink-900/60' : 'text-white/30')}>{relativeTime(msg.createdAt)}</p>
                </div>
              </div>
            )
          })}
        </div>

        {isLive &&
          (canChat ? (
            <div className="space-y-2 border-t border-white/[0.06] p-3">
              {sendError && <p className="text-xs text-red-300">{sendError}</p>}
              <div className="flex gap-2">
                {!staff && (
                  <button
                    type="button"
                    onClick={() => setAsQuestion(!asQuestion)}
                    title="Poser une question au coach"
                    aria-pressed={asQuestion}
                    className={cn(
                      'grid h-11 w-11 shrink-0 place-items-center rounded-2xl border transition',
                      asQuestion ? 'border-amber-400 bg-amber-400/15 text-amber-300' : 'border-white/10 text-white/50 hover:text-white',
                    )}
                  >
                    <HelpCircle size={18} />
                  </button>
                )}
                <input
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && send()}
                  maxLength={500}
                  placeholder={asQuestion ? 'Ta question au coach…' : 'Écris un message…'}
                  className="h-11 min-w-0 flex-1 rounded-2xl border border-white/10 bg-ink-800 px-4 text-sm text-white outline-none placeholder:text-white/30 focus:border-fit/50"
                />
                <Button size="icon" onClick={send} aria-label="Envoyer" disabled={!text.trim()}>
                  <Send size={16} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 border-t border-white/[0.06] bg-amber-400/[0.05] p-3">
              <Lock size={16} className="shrink-0 text-amber-300" />
              <p className="flex-1 text-xs text-white/65">Le chat et les questions au coach sont réservés aux membres Premium.</p>
              <Link to="/premium">
                <Button size="sm" variant="premium">
                  Premium
                </Button>
              </Link>
            </div>
          ))}
      </Card>
    </div>
  )
}
