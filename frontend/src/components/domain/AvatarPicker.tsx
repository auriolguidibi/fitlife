import { useRef, useState } from 'react'
import { Camera, ImagePlus, Trash2 } from 'lucide-react'
import { api } from '@/services'
import { useAuth } from '@/context/AuthContext'
import { Avatar, Button, Modal } from '@/components/ui'
import { squareResize } from '@/utils/image'
import { cn } from '@/utils/cn'

/** Photo de profil cliquable : choix d'une image, aperçu recadré, enregistrement. */
export function AvatarPicker({ size = 'xl', className }: { size?: 'lg' | 'xl'; className?: string }) {
  const { user, setUser } = useAuth()
  const input = useRef<HTMLInputElement>(null)
  const [preview, setPreview] = useState<{ blob: Blob; dataUrl: string } | null>(null)
  const [open, setOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null
  const name = `${user.firstName} ${user.lastName}`

  const pick = async (file?: File) => {
    if (!file) return
    setError('')
    try {
      setPreview(await squareResize(file, 512))
      setOpen(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Image illisible')
      setOpen(true)
    } finally {
      if (input.current) input.current.value = ''
    }
  }

  const save = async () => {
    if (!preview) return
    setBusy(true)
    try {
      setUser(await api.uploadAvatar(preview.blob))
      setOpen(false)
      setPreview(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Envoi impossible')
    } finally {
      setBusy(false)
    }
  }

  const remove = async () => {
    setBusy(true)
    try {
      setUser(await api.removeAvatar())
      setOpen(false)
      setPreview(null)
    } finally {
      setBusy(false)
    }
  }

  const dim = size === 'xl' ? 'h-24 w-24' : 'h-16 w-16'

  return (
    <>
      <button
        type="button"
        onClick={() => input.current?.click()}
        className={cn('group relative mx-auto block rounded-full', dim, className)}
        aria-label="Changer ma photo de profil"
      >
        <Avatar name={name} src={user.avatarUrl} size="xl" ring className={cn('!h-full !w-full', dim)} />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-ink-900/55 opacity-0 transition group-hover:opacity-100">
          <Camera size={22} className="text-white" />
        </span>
        <span className="absolute -bottom-1 -right-1 grid h-9 w-9 place-items-center rounded-full border-[3px] border-ink-800 bg-fit text-white shadow-fit transition group-hover:scale-110">
          <Camera size={16} />
        </span>
      </button>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => pick(e.target.files?.[0])}
      />

      <Modal open={open} onClose={() => !busy && setOpen(false)} title="Photo de profil" size="sm">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <span className="absolute -inset-2 rounded-full bg-gradient-to-br from-fit to-lime-300 opacity-60 blur-md" />
            {preview ? (
              <img src={preview.dataUrl} alt="Aperçu" className="relative h-40 w-40 rounded-full border-4 border-ink-700 object-cover" />
            ) : (
              <Avatar name={name} src={user.avatarUrl} size="xl" className="relative !h-40 !w-40" />
            )}
          </div>
          <p className="text-center text-xs text-white/50">
            L’image est recadrée au centre. Elle sera visible par les coachs et la communauté.
          </p>
          {error && <p className="w-full rounded-xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}
          <div className="grid w-full gap-2">
            {preview && (
              <Button fullWidth onClick={save} loading={busy}>
                Enregistrer cette photo
              </Button>
            )}
            <Button fullWidth variant="secondary" onClick={() => input.current?.click()} leftIcon={<ImagePlus size={16} />} disabled={busy}>
              {preview ? 'Choisir une autre image' : 'Choisir une image'}
            </Button>
            {user.avatarUrl && !preview && (
              <Button fullWidth variant="ghost" className="text-red-300" onClick={remove} loading={busy} leftIcon={<Trash2 size={16} />}>
                Supprimer ma photo
              </Button>
            )}
          </div>
        </div>
      </Modal>
    </>
  )
}
