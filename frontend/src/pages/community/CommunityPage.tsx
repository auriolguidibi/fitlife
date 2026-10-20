import { useState } from 'react'
import { Heart, MessageCircle, Plus, Send, Users } from 'lucide-react'
import { api } from '@/services'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/AuthContext'
import { Avatar, Badge, Button, Card, Modal, Spinner, Textarea } from '@/components/ui'
import { formatKm, relativeTime } from '@/utils/format'
import { cn } from '@/utils/cn'
import { PageHero } from '@/components/layout/PageHero'
import { pageHeroes } from '@/data/images'
import { activityTypeIcons, TypeIcon } from '@/components/ui'

export function CommunityPage() {
  const { user } = useAuth()
  const { data, loading, reload } = useAsync(() => api.getFeed(), [])
  const [composerOpen, setComposerOpen] = useState(false)
  const [content, setContent] = useState('')
  const [posting, setPosting] = useState(false)
  const [openComments, setOpenComments] = useState<string | null>(null)
  const [commentText, setCommentText] = useState('')

  if (loading || !data) return <Spinner label="Chargement du fil communautaire…" />

  const toggleLike = async (id: string) => {
    await api.toggleLike(id)
    reload()
  }

  const post = async () => {
    if (!content.trim()) return
    setPosting(true)
    try {
      await api.createPost(content.trim())
      setContent('')
      setComposerOpen(false)
      reload()
    } finally {
      setPosting(false)
    }
  }

  const comment = async (postId: string) => {
    if (!commentText.trim()) return
    await api.addComment(postId, commentText.trim())
    setCommentText('')
    reload()
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <PageHero
        eyebrow="Ensemble, on va plus loin"
        title="Communauté"
        subtitle="Partage tes performances, encourage les autres, inspire-toi."
        icon={<Users size={22} />}
        image={pageHeroes.community}
        actions={
          <Button onClick={() => setComposerOpen(true)} leftIcon={<Plus size={16} />}>
            Publier
          </Button>
        }
      />

      <div className="space-y-4">
        {data.map((post) => (
          <Card key={post.id} className="space-y-3">
            <div className="flex items-center gap-3">
              <Avatar name={post.userName} src={post.avatarUrl} size="md" />
              <div className="flex-1">
                <p className="text-sm font-bold text-white">{post.userName}</p>
                <p className="text-xs text-white/40">{relativeTime(post.createdAt)}</p>
              </div>
              {post.activitySummary && (
                <Badge tone="fit">
                  <TypeIcon icon={activityTypeIcons[post.activitySummary.type]} size={12} /> {formatKm(post.activitySummary.distanceKm)}
                </Badge>
              )}
            </div>

            <p className="text-sm leading-relaxed text-white/85">{post.content}</p>

            {post.activitySummary && (
              <Card variant="gradient" className="flex items-center justify-between" padding="sm">
                <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-white">
                  <TypeIcon icon={activityTypeIcons[post.activitySummary.type]} size={14} className="text-fit" /> Activité partagée
                </span>
                <span className="text-sm font-extrabold text-fit">
                  {formatKm(post.activitySummary.distanceKm)}
                </span>
              </Card>
            )}

            <div className="flex gap-3 border-t border-white/5 pt-3">
              <button
                onClick={() => toggleLike(post.id)}
                className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold transition',
                  post.likedByMe ? 'text-red-400' : 'text-white/50 hover:text-white',
                )}
              >
                <Heart size={17} className={post.likedByMe ? 'fill-red-400' : ''} /> {post.likes}
              </button>
              <button
                onClick={() => setOpenComments(openComments === post.id ? null : post.id)}
                className="flex items-center gap-1.5 text-sm font-semibold text-white/50 hover:text-white"
              >
                <MessageCircle size={17} /> {post.comments.length}
              </button>
            </div>

            {openComments === post.id && (
              <div className="space-y-3 border-t border-white/5 pt-3">
                {post.comments.map((c) => (
                  <div key={c.id} className="flex gap-2">
                    <Avatar name={c.userName} size="xs" />
                    <div className="rounded-2xl bg-ink-800 px-3 py-2">
                      <p className="text-xs font-bold text-fit">{c.userName}</p>
                      <p className="text-sm text-white/85">{c.text}</p>
                    </div>
                  </div>
                ))}
                <div className="flex gap-2">
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && comment(post.id)}
                    placeholder="Écris un commentaire…"
                    className="h-10 flex-1 rounded-2xl bg-ink-800 px-4 text-sm text-white placeholder:text-white/30 outline-none"
                  />
                  <Button size="icon" onClick={() => comment(post.id)} aria-label="Commenter">
                    <Send size={15} />
                  </Button>
                </div>
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={composerOpen} onClose={() => setComposerOpen(false)} title="Nouvelle publication">
        <Textarea
          placeholder={`Quoi de neuf ${user?.firstName} ? Partage ta séance, ta perf, ta motivation…`}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          autoFocus
        />
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setComposerOpen(false)}>
            Annuler
          </Button>
          <Button onClick={post} loading={posting} disabled={!content.trim()}>
            Publier
          </Button>
        </div>
      </Modal>
    </div>
  )
}