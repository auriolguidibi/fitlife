import { LifeBuoy, MessageCircle, Mail, AlertTriangle } from 'lucide-react'
import { Card, StatCard } from '@/components/ui'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'

export function HelpPage() {
  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="On est là pour toi"
        title="Aide & support"
        subtitle="Tout pour bien utiliser FitLife, en toute sérénité."
        icon={<LifeBuoy size={22} />}
        image={pageHeroes.help}
      />

      <Card variant="glass" className="flex items-start gap-3 text-sm">
        <AlertTriangle className="mt-0.5 shrink-0 text-amber-300" size={18} />
        <p className="text-white/70">
          FitLife propose un accompagnement fitness et nutrition. Il ne remplace pas un médecin, un
          nutritionniste ou un professionnel de santé. Consulte-les pour toute question médicale.
        </p>
      </Card>

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Lives" value="18 h" />
        <StatCard label="Séances" value="20+" />
      </div>

      <section className="space-y-3">
        <h2 className="font-bold text-white">Questions fréquentes</h2>
        {[
          ['Comment démarrer une séance ?', "Rends-toi sur « Programme », choisis la séance de la semaine et appuie dessus."],
          ['Comment une activité compte-t-elle au classement ?', "Termine une session GPS puis valide-la. Les sessions suspectes (vitesse incohérente, GPS anormal, doublon) sont analysées avant d'être ajoutées."],
          ['Le Coach IA remplace-t-il un professionnel ?', "Non. Il donne conseils généraux de motivation et d'organisation, pas d'avis médical."],
          ['Comment passer Premium ?', "Va dans « Premium » et choisis Essentiel ou Premium, mensuel ou annuel."],
          ['Mes données sont-elles sauvegardées ?', "Oui, tes séances, repas, activités et progrès sont enregistrés dans ton profil."],
        ].map(([q, a]) => (
          <Card key={q}>
            <p className="text-sm font-bold text-white">{q}</p>
            <p className="mt-1 text-sm text-white/60">{a}</p>
          </Card>
        ))}
      </section>

      <Card className="flex items-center gap-4">
        <span className="grid h-12 w-12 place-items-center rounded-2xl bg-fit/15 text-fit">
          <MessageCircle size={22} />
        </span>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Contacter le support</p>
          <p className="text-xs text-white/50">
            Réponse en moins de 24h – <Mail size={12} className="inline" /> support@fitlife.app
          </p>
        </div>
      </Card>
    </div>
  )
}