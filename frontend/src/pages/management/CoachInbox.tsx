import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Crown, Inbox, MessageCircle } from 'lucide-react'
import type { CoachMessage, CoachThread } from '@/types'
import { api } from '@/services'
import { Card, EmptyState, Spinner } from '@/components/ui'
import { ChatThread } from '@/components/domain/ChatThread'
import { cn } from '@/utils/cn'

function ago(iso: string): string {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'à l’instant'
  if (min < 60) return `il y a ${min} min`
  if (min < 1440) return `il y a ${Math.round(min / 60)} h`
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })
}

/** Boîte de réception des coachs : toutes les conversations des membres. */
export function CoachInbox() {
  const [threads, setThreads] = useState<CoachThread[] | null>(null)
  const [selected, setSelected] = useState<string | null>(null)
  const [messages, setMessages] = useState<CoachMessage[]>([])

  const loadInbox = useCallback(async () => {
    setThreads(await api.getCoachInbox())
  }, [])
  const loadThread = useCallback(async (memberId: string) => {
    setMessages(await api.getCoachThread(memberId))
  }, [])

  useEffect(() => {
    void loadInbox()
    const id = window.setInterval(() => {
      void loadInbox()
      if (selected) void loadThread(selected)
    }, 8000)
    return () => window.clearInterval(id)
  }, [loadInbox, loadThread, selected])

  const open = async (memberId: string) => {
    setSelected(memberId)
    setMessages([])
    await loadThread(memberId)
    void loadInbox()
  }

  if (!threads) return <Spinner label="Chargement des messages…" />
  const current = threads.find((t) => t.memberId === selected)

  return (
    <Card padding="none" className="grid min-h-[520px] overflow-hidden lg:grid-cols-[320px_1fr]">
      {/* Liste des conversations */}
      <div className={cn('border-white/5 lg:border-r', selected && 'hidden lg:block')}>
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <Inbox size={16} className="text-fit" />
          <p className="text-sm font-bold text-white">Messages des membres</p>
        </div>
        {threads.length === 0 ? (
          <div className="p-4">
            <EmptyState icon={<MessageCircle />} title="Aucun message pour l’instant" description="Les questions des membres arriveront ici." />
          </div>
        ) : (
          <ul className="max-h-[600px] divide-y divide-white/5 overflow-y-auto">
            {threads.map((t) => (
              <li key={t.memberId}>
                <button
                  type="button"
                  onClick={() => void open(t.memberId)}
                  className={cn('flex w-full items-start gap-3 px-4 py-3 text-left transition hover:bg-white/[0.03]', selected === t.memberId && 'bg-fit/10')}
                >
                  <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-ink-600 text-sm font-bold text-white">
                    {t.avatarUrl ? <img src={t.avatarUrl} alt="" className="h-full w-full object-cover" /> : t.memberName.charAt(0)}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-1.5">
                      <span className="truncate text-sm font-semibold text-white">{t.memberName}</span>
                      {t.isPremium && <Crown size={12} className="shrink-0 text-amber-300" aria-label="Premium" />}
                      <span className="ml-auto shrink-0 text-[10px] text-white/35">{ago(t.lastAt)}</span>
                    </span>
                    <span className={cn('mt-0.5 block truncate text-xs', t.unread ? 'font-semibold text-white' : 'text-white/45')}>
                      {t.lastFromCoach ? 'Toi : ' : ''}
                      {t.lastText}
                    </span>
                  </span>
                  {t.unread > 0 && (
                    <span className="mt-1 grid h-5 min-w-5 place-items-center rounded-full bg-fit px-1.5 text-[10px] font-bold text-white">{t.unread}</span>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Conversation */}
      <div className={cn('flex min-h-[520px] flex-col', !selected && 'hidden lg:flex')}>
        {current ? (
          <>
            <div className="flex items-center gap-3 border-b border-white/5 px-4 py-3">
              <button type="button" onClick={() => setSelected(null)} className="grid h-9 w-9 place-items-center rounded-xl text-white/60 hover:bg-white/5 lg:hidden" aria-label="Retour">
                <ArrowLeft size={18} />
              </button>
              <p className="text-sm font-bold text-white">{current.memberName}</p>
              {current.isPremium && <span className="rounded-full bg-amber-400/15 px-2 py-0.5 text-[10px] font-bold text-amber-300">Premium</span>}
            </div>
            <ChatThread
              messages={messages}
              viewerIsCoach
              placeholder={`Répondre à ${current.memberName.split(' ')[0]}…`}
              onSend={async (text) => {
                setMessages(await api.replyToMember(current.memberId, text))
                void loadInbox()
              }}
            />
          </>
        ) : (
          <div className="grid flex-1 place-items-center p-6 text-center text-sm text-white/45">Choisis une conversation pour répondre.</div>
        )}
      </div>
    </Card>
  )
}
