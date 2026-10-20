import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { MessageCircle, ShieldCheck, UserRound } from 'lucide-react'
import type { CoachMessage } from '@/types'
import { api } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { Button, Card, Spinner } from '@/components/ui'
import { PageHero } from '@/components/layout/PageHero'
import { ChatThread } from '@/components/domain/ChatThread'
import { pageHeroes } from '@/data/images'
import { isStaff } from '@/utils/roles'

/** Le membre écrit aux vrais coachs FitLife ; les réponses arrivent ici (et en notification). */
export function CoachChatPage() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<CoachMessage[] | null>(null)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    try {
      setMessages(await api.getCoachMessages())
      setError('')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Messagerie indisponible')
    }
  }, [])

  useEffect(() => {
    void load()
    // Les réponses du coach apparaissent sans recharger la page.
    const id = window.setInterval(() => void load(), 8000)
    return () => window.clearInterval(id)
  }, [load])

  if (isStaff(user)) {
    return (
      <Card className="space-y-3 text-center">
        <ShieldCheck className="mx-auto text-fit" size={28} />
        <p className="font-semibold text-white">Tu es coach : les messages des membres sont dans l’Espace Gestion.</p>
        <Link to="/gestion?section=messages">
          <Button>Ouvrir la messagerie des membres</Button>
        </Link>
      </Card>
    )
  }

  return (
    <div className="flex min-h-[calc(100dvh-200px)] flex-col space-y-4 animate-fade-in lg:h-[calc(100vh-110px)]">
      <PageHero
        compact
        eyebrow="Messagerie"
        title="Mon coach"
        subtitle="Pose tes questions aux coachs FitLife : entraînement, alimentation, motivation."
        icon={<MessageCircle size={22} />}
        image={pageHeroes.coachAi}
        imagePosition="70% 50%"
      />
      <Card padding="none" className="flex h-[60dvh] min-h-[380px] flex-col overflow-hidden lg:h-auto lg:flex-1">
        {messages === null ? (
          error ? <p className="p-6 text-center text-sm text-red-300">{error}</p> : <Spinner label="Chargement de la conversation…" />
        ) : (
          <ChatThread
            messages={messages}
            viewerIsCoach={false}
            placeholder="Écris au coach…"
            onSend={async (text) => setMessages(await api.sendCoachMessage(text))}
            empty={
              <div className="space-y-3 py-8 text-center">
                <div className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-fit/15 text-fit">
                  <UserRound size={28} />
                </div>
                <p className="mx-auto max-w-sm text-sm text-white/60">
                  Écris ton premier message : un coach FitLife te répondra ici. Tu recevras une notification dès qu’il
                  t’aura répondu.
                </p>
              </div>
            }
          />
        )}
      </Card>
      <p className="text-center text-[10px] text-white/30">
        Les coachs ne remplacent pas un médecin. En cas de douleur ou de problème de santé, consulte un professionnel.
      </p>
    </div>
  )
}
