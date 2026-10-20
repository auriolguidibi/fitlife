import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Check, Lock, Mail } from 'lucide-react'
import { Button, Input, PasswordInput } from '@/components/ui'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [remember, setRemember] = useState(true)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState<string | false>(false)

  const doLogin = async (mail: string, pass: string, key: string) => {
    setError('')
    setLoading(key)
    try {
      await login(mail, pass)
      navigate('/', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Connexion impossible')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <h1 className="text-3xl font-extrabold text-white">
        Content de te revoir
      </h1>
      <p className="mt-2 text-sm text-white/55">Ta séance du jour t’attend. On reprend là où tu t’étais arrêté·e.</p>

      <form onSubmit={(e) => { e.preventDefault(); doLogin(email, password, 'form') }} className="mt-7 space-y-4">
        <Input
          label="Email"
          type="email"
          autoComplete="email"
          placeholder="ton.email@exemple.com"
          leftIcon={<Mail size={16} />}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <PasswordInput
          label="Mot de passe"
          autoComplete="current-password"
          placeholder="••••••••"
          leftIcon={<Lock size={16} />}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setRemember((r) => !r)}
            className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-white"
          >
            <span
              className={cn(
                'grid h-[18px] w-[18px] place-items-center rounded-md border transition',
                remember ? 'border-fit bg-fit text-white' : 'border-white/20',
              )}
            >
              {remember && <Check size={12} strokeWidth={3} />}
            </span>
            Rester connecté·e
          </button>
          <Link to="/forgot-password" className="text-xs font-medium text-fit hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>

        {error && (
          <p className="rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
        )}

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={loading === 'form'}
          className="shine group"
          rightIcon={<ArrowRight size={18} className="transition group-hover:translate-x-1" />}
        >
          Se connecter
        </Button>
      </form>

      <p className="mt-7 text-center text-sm text-white/50">
        Pas encore de compte ?{' '}
        <Link to="/register" className="font-semibold text-fit hover:underline">
          Rejoins FitLife gratuitement
        </Link>
      </p>
    </div>
  )
}
