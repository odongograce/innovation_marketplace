'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Eye, Heart } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'
import { toggleProjectLike } from '@/lib/api/likes'

type ProjectCardVariant = 'default' | 'featuredDark'

interface ProjectCardProps {
  id: number
  title: string
  description: string
  image?: string
  technologies?: string[] | string
  category: string
  author: string
  views?: number
  rating?: number

  liked?: boolean
  likesCount?: number

  variant?: ProjectCardVariant
}

const fallbackImages = [
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735910/%D8%AF%D9%8A%D8%AC%D9%8A%D8%AA%D8%A7%D9%84_%D9%83%D8%A7%D8%B1%D8%AF_rmval4.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735912/Self_Productivity_jogxol.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735916/Ai-%D1%85%D1%83%D0%B4%D0%BE%D0%B6%D0%BD%D0%B8%D0%BA_h7wj5r.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735910/Friendly_Futuristic_Robot_wbvmbh.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735909/download_2_eeb4ac.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735908/AI_Images_4k_-_Freepik_231224786924_jc3b5l.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735916/Ai-%D1%85%D1%83%D0%B4%D0%BE%D0%B6%D0%BD%D0%B8%D0%BA_h7wj5r.jpg',
]

const BASE = process.env.NEXT_PUBLIC_BASE_URL || ''

function resolveImageUrl(src: string, fallback: string) {
  const s = (src || '').trim()
  if (!s) return fallback

  if (s.startsWith('http://') || s.startsWith('https://')) return s

  const base = (BASE || '').replace(/\/+$/, '')
  if (!base) return s.startsWith('/') ? s : `/${s}`

  const path = s.startsWith('/') ? s : `/${s}`
  return `${base}${path}`
}

export function ProjectCard({
  id,
  title,
  description,
  image,
  technologies,
  category,
  author,
  views = 0,
  rating = 0,

  liked = false,
  likesCount = 0,

  variant = 'default',
}: ProjectCardProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [isLiked, setIsLiked] = useState<boolean>(liked)
  const [likeCount, setLikeCount] = useState<number>(likesCount)
  const [likeLoading, setLikeLoading] = useState(false)

  const fallbackById = useMemo(() => {
    const idx = Math.abs(Number(id) || 0) % fallbackImages.length
    return fallbackImages[idx]
  }, [id])

  const resolvedImage = useMemo(() => {
    return resolveImageUrl(image ?? '', fallbackById)
  }, [image, fallbackById])

  const techs = useMemo(() => {
    if (Array.isArray(technologies)) return technologies.filter(Boolean)
    if (typeof technologies === 'string')
      return technologies
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    return []
  }, [technologies])

  const goToProject = () => router.push(`/projects/${id}`)

  const onToggleLike = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()

    if (!session) {
      const callbackUrl = window.location.pathname + window.location.search
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      return
    }

    if (likeLoading) return

    const nextLiked = !isLiked

    setIsLiked(nextLiked)
    setLikeCount((c) => Math.max(0, c + (nextLiked ? 1 : -1)))

    setLikeLoading(true)
    try {
      const res = await toggleProjectLike({
        projectId: id,
        like: nextLiked,
        token,
      })

      if (typeof res.liked === 'boolean') setIsLiked(res.liked)
      if (typeof res.likes_count === 'number') setLikeCount(res.likes_count)
    } catch {
      setIsLiked((prev) => !prev)
      setLikeCount((c) => Math.max(0, c + (nextLiked ? -1 : 1)))
    } finally {
      setLikeLoading(false)
    }
  }

  const isDark = variant === 'featuredDark'

  const cardClass = isDark
    ? [
        'group relative h-full overflow-hidden rounded-2xl',
        'border border-white/10 bg-white/5',
        'shadow-2xl backdrop-blur',
        'transition will-change-transform',
        'hover:-translate-y-1 hover:border-yellow-400/20',
        'hover:shadow-[0_30px_70px_-30px_rgba(0,0,0,0.85)]',
      ].join(' ')
    : [
        'group relative h-full overflow-hidden rounded-2xl',
        'border border-black/5 bg-white',
        'shadow-md transition will-change-transform',
        'hover:-translate-y-1 hover:shadow-xl',
        'dark:border-white/10 dark:bg-gray-900/90',
      ].join(' ')

  const badgeClass = isDark
    ? 'border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 backdrop-blur'
    : 'bg-white/90 text-gray-900 shadow-sm'

  const likeBtnClass = isDark
    ? 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/45 px-3 py-1 text-xs font-medium text-white shadow-sm backdrop-blur transition hover:bg-black/60 disabled:opacity-60'
    : 'inline-flex items-center gap-2 rounded-full bg-white/90 px-3 py-1 text-xs font-medium text-gray-900 shadow-sm transition hover:bg-white disabled:opacity-60'

  const titleClass = isDark ? 'text-slate-100' : 'text-foreground'
  const descClass = isDark ? 'text-slate-200/80' : 'text-foreground/70'
  const metaMuted = isDark ? 'text-slate-200/70' : 'text-foreground/60'
  const authorClass = isDark ? 'text-yellow-100' : 'text-primary'

  const viewBtnClass = isDark
    ? 'w-1/2 bg-yellow-400/15 text-yellow-50 hover:bg-yellow-400/25 border border-yellow-400/20'
    : 'w-1/2 bg-primary text-white hover:bg-primary/90'

  return (
    <Card className={cardClass}>
      {isDark && (
        <div
          className="pointer-events-none absolute inset-0 z-[1] opacity-0 transition-opacity duration-300 group-hover:opacity-100"
          aria-hidden="true"
          style={{
            background: 'radial-gradient(700px circle at 50% 0%, rgba(250,204,21,0.16), transparent 55%)',
          }}
        />
      )}

      <Link href={`/projects/${id}`} className="absolute inset-0 z-0" aria-label={`Open project ${title}`} />

      {/* Image */}
      <div className="relative z-10 h-44 w-full overflow-hidden bg-muted">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={resolvedImage}
          alt={title}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          loading="lazy"
          onError={(e) => {
            ;(e.currentTarget as HTMLImageElement).src = fallbackById
          }}
        />

        <div
          className={`absolute inset-0 ${
            isDark
              ? 'bg-gradient-to-t from-black/75 via-black/15 to-transparent'
              : 'bg-gradient-to-t from-black/40 via-black/0 to-transparent'
          }`}
          aria-hidden="true"
        />

        <div className="absolute left-4 top-4 z-20">
          <Badge className={`${badgeClass} font-display`}>{category}</Badge>
        </div>

        <div className="absolute right-4 top-4 z-20">
          <button
            type="button"
            onClick={onToggleLike}
            disabled={likeLoading}
            className={likeBtnClass}
            aria-label={isLiked ? 'Unlike project' : 'Like project'}
          >
            <Heart
              className={`h-4 w-4 ${isLiked ? 'fill-red-500 text-red-500' : isDark ? 'text-white' : 'text-gray-700'}`}
            />
            <span>{likeCount}</span>
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-[calc(100%-11rem)] flex-col p-5">
        <div className="space-y-2">
          <h3 className={`text-lg font-semibold leading-snug line-clamp-2 font-display ${titleClass}`}>{title}</h3>
          <p className={`text-sm line-clamp-3 ${descClass}`}>{description}</p>
        </div>

        {techs.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            {techs.slice(0, 3).map((tech) => (
              <Badge
                key={tech}
                variant="outline"
                className={isDark ? 'border-white/15 bg-white/5 text-xs text-slate-100/90' : 'border-primary/20 bg-primary/5 text-xs'}
              >
                {tech}
              </Badge>
            ))}
          </div>
        )}

        <div className={`mt-4 flex items-center justify-between text-sm ${metaMuted}`}>
          <span className={`font-medium ${authorClass}`}>{author}</span>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {views}
            </span>
            <span className="flex items-center gap-1">{Number.isFinite(rating) ? rating.toFixed(1) : '0.0'}</span>
          </div>
        </div>

        <div className="mt-auto pt-4 flex justify-center">
          <Button
            type="button"
            size="sm"
            variant={isDark ? 'outline' : 'default'}
            className={viewBtnClass}
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              goToProject()
            }}
          >
            <Eye className="mr-2 h-4 w-4" />
            View Details
          </Button>
        </div>
      </div>
    </Card>
  )
}
