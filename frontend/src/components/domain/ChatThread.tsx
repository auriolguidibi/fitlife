import { useEffect, useRef, useState } from 'react'
import { CheckCheck, Send } from 'lucide-react'
import type { CoachMessage } from '@/types'
import { Button } from '@/components/ui'
import { cn } from '@/utils/cn'

function time(iso: string): string {
  const d = new Date(iso)
  const today = new Date().toDateString() === d.toDateString()
  return today
    ? d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
    : d.toLocaleString('fr-FR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
}

interface ChatThreadProps {
  messages: CoachMessage[]
  /** true : l'écran est celui du coach (ses messages à droite). */
  viewerIsCoach: boolean
  onSend: (text: string) => Promise<void>
  placeholder?: string
  empty?: React.ReactNode
}

/** Fil de discussion membre <-> coach, avec zone de saisie. */
export function ChatThread({ messages, viewerIsCoach, onSend, placeholder = 'Écris ton message…', empty }: ChatThreadProps) {
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [messages.length])

  const send = async () => {
    const value = text.trim()
    if (!value || sending) return
    setSending(true)
    setError('')
    try {
      await onSend(value)
      setText('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
        {messages.length === 0
          ? empty
          : messages.map((m) => {
              const mine = m.fromCoach === viewerIsCoach
              return (
                <div key={m.id} className={cn('flex', mine ? 'justify-end' : 'justify-start')}>
                  <div className={cn('max-w-[85%] space-y-1', mine && 'text-right')}>
                    {!mine && <p className="px-1 text-[11px] font-semibold text-fit">{m.senderName}</p>}
                    <div
                      className={cn(
                        'whitespace-pre-wrap break-words rounded-2xl px-4 py-2.5 text-left text-sm leading-relaxed',
                        mine ? 'rounded-br-md bg-fit text-white' : 'rounded-bl-md bg-ink-700 text-white/90',
                      )}
                    >
                      {m.text}
                    </div>
                    <p className="flex items-center justify-end gap-1 px-1 text-[10px] text-white/35">
                      {time(m.createdAt)}
                      {mine && m.read && <CheckCheck size={12} className="text-fit" aria-label="Lu" />}
                    </p>
                  </div>
                </div>
              )
            })}
        <div ref={endRef} />
      </div>
      <div className="border-t border-white/5 p-3">
        {error && <p className="mb-2 text-xs text-red-300">{error}</p>}
        <div className="flex items-end gap-2">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                void send()
              }
            }}
            rows={1}
            maxLength={2000}
            placeholder={placeholder}
            className="max-h-32 min-h-[44px] flex-1 resize-none rounded-2xl border border-white/10 bg-ink-800 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none focus:border-fit/50"
          />
          <Button size="icon" onClick={() => void send()} disabled={!text.trim()} loading={sending} aria-label="Envoyer">
            <Send size={16} />
          </Button>
        </div>
      </div>
    </div>
  )
}
