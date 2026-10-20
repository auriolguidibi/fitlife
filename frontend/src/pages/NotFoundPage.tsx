import { Link } from 'react-router-dom'
import { Button } from '@/components/ui'

export function NotFoundPage() {
  return (
    <div className="grid min-h-screen place-items-center bg-ink-900 px-5 text-center">
      <div>
        <p className="text-7xl font-extrabold text-fit">404</p>
        <h1 className="mt-3 text-xl font-bold text-white">Page introuvable</h1>
        <p className="mt-1 text-sm text-white/50">Cette page n’existe pas ou a été déplacée.</p>
        <Link to="/">
          <Button className="mt-6">Retour à l’accueil</Button>
        </Link>
      </div>
    </div>
  )
}