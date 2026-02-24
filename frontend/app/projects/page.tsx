'use client'

import { useEffect, useMemo, useState } from 'react'
import { Search, ListFilter, ArrowUpDown, X } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { ProjectCard } from '@/components/project-card'
import { fetchApprovedProjects } from '@/lib/api'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const CATEGORIES = [
  'All',
  'HealthTech',
  'EdTech',
  'FinTech',
  'AgriTech',
  'SaaS',
  'E-Commerce',
  'AI/ML',
  'Real Estate',
] as const

type SortKey = 'newest' | 'views' | 'rating'

type ApprovedProject = {
  id: number
  title?: string
  description?: string
  submitted_name?: string
  technologies?: string[] | string
  categories?: { name: string }[]
  thumbnail_url?: string | null
  image?: string | null
  views?: number
  rating?: number
  liked_by_me?: boolean
  likes_count?: number
}

function safeNumber(n: unknown, fallback = 0) {
  return typeof n === 'number' && Number.isFinite(n) ? n : fallback
}

function normalizeTech(tech: ApprovedProject['technologies']): string[] {
  if (Array.isArray(tech)) return tech
  if (typeof tech === 'string') {
    return tech
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
  }
  return []
}

export default function ProjectsPage() {
  const [search, setSearch] = useState('')
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]>('All')
  const [sortBy, setSortBy] = useState<SortKey>('newest')

  const [projects, setProjects] = useState<ApprovedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError(null)

    // ✅ only approved projects
    fetchApprovedProjects()
      .then((data) => {
        if (!mounted) return
        setProjects(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (!mounted) return
        setError('Failed to load approved projects. Please refresh and try again.')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return projects.filter((project) => {
      const title = (project.title ?? '').toLowerCase()
      const desc = (project.description ?? '').toLowerCase()
      const author = (project.submitted_name ?? '').toLowerCase()

      const matchesSearch = !q || title.includes(q) || desc.includes(q) || author.includes(q)
      const matchesCategory =
        category === 'All' || (project.categories ?? []).some((c) => c?.name === category)

      return matchesSearch && matchesCategory
    })
  }, [projects, search, category])

  const sorted = useMemo(() => {
    const list = [...filtered]
    list.sort((a, b) => {
      if (sortBy === 'views') return safeNumber(b.views, 0) - safeNumber(a.views, 0)
      if (sortBy === 'rating') return safeNumber(b.rating, 0) - safeNumber(a.rating, 0)
      // newest fallback: higher id first
      return safeNumber(b.id, 0) - safeNumber(a.id, 0)
    })
    return list
  }, [filtered, sortBy])

  const hasActiveFilters = search.trim().length > 0 || category !== 'All'

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="pb-12">
        {/* Themed Header */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
              <div className="max-w-2xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    Approved Projects
                  </Badge>
                  <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                    {loading ? 'Loading…' : `${filtered.length} results`}
                  </Badge>
                  {!loading && (
                    <Badge variant="outline" className="rounded-full px-3 py-1 text-xs">
                      {projects.length} total
                    </Badge>
                  )}
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">
                  Explore Projects
                </h1>
                <p className="mt-2 text-base text-foreground/60 sm:text-lg">
                  Browse only reviewed and approved student-built projects.
                </p>
              </div>

              {/* Quick stats / actions */}
              <div className="flex flex-wrap items-center gap-2">
                {hasActiveFilters && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setSearch('')
                      setCategory('All')
                      setSortBy('newest')
                    }}
                    className="h-9"
                  >
                    <X className="mr-2 h-4 w-4" />
                    Clear filters
                  </Button>
                )}
                <Button variant="outline" size="sm" className="h-9" disabled>
                  <ListFilter className="mr-2 h-4 w-4" />
                  Filters
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Filters Bar */}
        <section className="sticky top-16 z-40 border-b border-border bg-background/70 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <Card className="border-border/60 bg-background/70 p-3 backdrop-blur">
              <div className="flex flex-col gap-3">
                {/* Search */}
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                  <Input
                    placeholder="Search by title, author, or description…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="h-10 pl-9"
                  />
                </div>

                {/* Category + Sort */}
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  {/* Category pills */}
                  <div className="flex flex-wrap gap-2">
                    {CATEGORIES.map((cat) => (
                      <Button
                        key={cat}
                        type="button"
                        size="sm"
                        variant={category === cat ? 'default' : 'outline'}
                        className="h-9"
                        onClick={() => setCategory(cat)}
                      >
                        {cat}
                      </Button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2 lg:justify-end">
                    <div className="flex items-center gap-2 text-xs text-foreground/60">
                      <ArrowUpDown className="h-4 w-4" />
                      Sort
                    </div>
                    <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortKey)}>
                      <SelectTrigger className="h-9 w-full lg:w-44">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="newest">Newest</SelectItem>
                        <SelectItem value="views">Most Viewed</SelectItem>
                        <SelectItem value="rating">Highest Rated</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Projects */}
        <section className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {error ? (
              <Card className="p-6">
                <div className="space-y-2">
                  <div className="text-lg font-semibold">Something went wrong</div>
                  <p className="text-sm text-foreground/60">{error}</p>
                  <div className="pt-2">
                    <Button onClick={() => window.location.reload()}>Refresh</Button>
                  </div>
                </div>
              </Card>
            ) : loading ? (
              <ProjectsSkeleton />
            ) : sorted.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {sorted.map((project) => {
                  const cat =
                    (project.categories && project.categories[0] && project.categories[0].name) ||
                    'Approved'

                  const image = (project.thumbnail_url ?? project.image ?? '').trim() || undefined

                  return (
                    <ProjectCard
                      key={project.id}
                      id={project.id}
                      title={project.title ?? 'Untitled project'}
                      description={project.description ?? 'No description provided.'}
                      image={image}
                      technologies={normalizeTech(project.technologies)}
                      category={cat}
                      author={project.submitted_name || 'Team'}
                      views={safeNumber(project.views, 0)}
                      rating={project.rating ?? 4.6}
                      liked={project.liked_by_me ?? false}
                      likesCount={project.likes_count ?? 0}
                    />
                  )
                })}
              </div>
            ) : (
              <Card className="p-10 text-center">
                <p className="text-lg font-semibold">No approved projects found</p>
                <p className="mt-2 text-sm text-foreground/60">
                  Try adjusting your search or selecting a different category.
                </p>
                <div className="mt-4 flex justify-center">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('')
                      setCategory('All')
                      setSortBy('newest')
                    }}
                  >
                    Clear Filters
                  </Button>
                </div>
              </Card>
            )}
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}

function ProjectsSkeleton() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: 9 }).map((_, i) => (
        <Card key={i} className="overflow-hidden">
          <div className="aspect-video animate-pulse bg-muted" />
          <div className="p-4 space-y-3">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="flex gap-2 pt-2">
              <div className="h-6 w-16 animate-pulse rounded bg-muted" />
              <div className="h-6 w-20 animate-pulse rounded bg-muted" />
              <div className="h-6 w-14 animate-pulse rounded bg-muted" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}
