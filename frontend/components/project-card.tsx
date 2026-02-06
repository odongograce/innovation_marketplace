'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Heart, MessageCircle, Eye } from 'lucide-react'
import Link from 'next/link'
import { useState } from 'react'

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
}: ProjectCardProps) {
  const [isLiked, setIsLiked] = useState(false)

  const techs = Array.isArray(technologies)
    ? technologies
    : typeof technologies === 'string'
      ? technologies.split(',').map((s) => s.trim()).filter(Boolean)
      : []

  return (
    <Card className="relative h-full overflow-hidden border-0 bg-white/95 shadow-md transition hover:shadow-xl dark:bg-gray-900/90">
      {/* Make whole card clickable without breaking buttons */}
      <Link
        href={`/projects/${id}`}
        className="absolute inset-0 z-0"
        aria-label={`Open project ${title}`}
      />

      {/* Image */}
      <div className="relative z-10 h-44 w-full overflow-hidden bg-muted">
        {image ? (
          <img
            src={image}
            alt={title}
            className="h-full w-full object-cover transition-transform duration-500 hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <span className="text-5xl">💻</span>
          </div>
        )}

        {/* Category badge */}
        <div className="absolute left-4 top-4">
          <Badge className="bg-white/90 text-gray-900 shadow-sm">
            {category}
          </Badge>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 flex h-[calc(100%-11rem)] flex-col p-5">
        {/* Title + desc */}
        <div className="space-y-2">
          <h3 className="text-lg font-bold leading-snug line-clamp-2">
            {title}
          </h3>
          <p className="text-sm text-foreground/70 line-clamp-3">
            {description}
          </p>
        </div>

        {/* Tech chips */}
        <div className="mt-4 flex flex-wrap gap-2">
          {techs.slice(0, 3).map((tech) => (
            <Badge
              key={tech}
              variant="outline"
              className="text-xs bg-primary/5 border-primary/20"
            >
              {tech}
            </Badge>
          ))}
        </div>

        {/* Meta row sticks nicely above actions */}
        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="font-medium text-primary">{author}</span>
          <div className="flex items-center gap-3 text-foreground/60">
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {views}
            </span>
            <span className="flex items-center gap-1">
              ⭐ {Number.isFinite(rating) ? rating.toFixed(1) : '0.0'}
            </span>
          </div>
        </div>

        {/* Actions pinned to bottom */}
        <div className="mt-auto pt-4">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="bg-transparent hover:bg-primary hover:text-white"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // TODO: save action
              }}
            >
              <Heart className="mr-2 h-4 w-4" />
              Save
            </Button>

            <Button
              type="button"
              size="sm"
              className="bg-primary text-white hover:bg-primary/90"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                // Optional: navigate manually if you want view button to open
                window.location.href = `/projects/${id}`
              }}
            >
              <Eye className="mr-2 h-4 w-4" />
              View
            </Button>
          </div>
        </div>
      </div>
    </Card>
  )
}
