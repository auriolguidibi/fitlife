import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, ArrowRight, KeyRound, Mail, MailCheck } from 'lucide-react'
import { Button, Input } from '@/components/ui'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)

  if (sent) {
    return (
      <div className="text-center">
        <div className="relative mx-auto grid h-20 w-20 place-items-center">
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-fit/30" />
          <span className="relative grid h-20 w-20 place-items-center rounded-full bg-fit/15 text-fit">
            <MailCheck size={32} />
          </span>
        </div>
        <h1 className="mt-6 text-2xl font-extrabold text-white">Regarde ta boîte mail</h1>
        <p className="mt-2 text-sm leading-relaxed text-white/55">
          Si un compte existe pour <span className="font-semibold text-white">{email}</span>, tu recevras un lien
          de réinitialisation dans quelques minutes. Pense à vérifier tes spams.
        </p>
        <Link to="/login" className="mt-7 block">
          <Button fullWidth size="lg" leftIcon={<ArrowLeft size={18} />}>
            Retour à la connexion
          </Button>
        </Link>
        <p className="mt-4 text-[11px] text-white/30">Action simulée dans la version démo.</p>
      </div>
    )
  }

  return (
    <div>
      <span className="grid h-14 w-14 place-items-center rounded-2xl bg-fit/15 text-fit">
        <KeyRound size={24} />
      </span>
      <h1 className="mt-5 text-3xl font-extrabold text-white">Mot de passe oublié ?</h1>
      <p className="mt-2 text-sm text-white/55">
        Ça arrive aux meilleurs. Indique ton email, on t’envoie un lien pour en choisir un nouveau.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          setSent(true)
        }}
        className="mt-7 space-y-4"
      >
        <Input
          label="Email"
          type="email"
          placeholder="ton.email@exemple.com"
          leftIcon={<Mail size={16} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          autoFocus
          required
        />
        <Button
          type="submit"
          fullWidth
          size="lg"
          className="shine group"
          rightIcon={<ArrowRight size={18} className="transition group-hover:translate-x-1" />}
        >
          Envoyer le lien
        </Button>
      </form>

      <Link
        to="/login"
        className="mt-7 flex items-center justify-center gap-1.5 text-sm font-semibold text-white/55 hover:text-white"
      >
        <ArrowLeft size={15} /> Retour à la connexion
      </Link>
    </div>
  )
}
