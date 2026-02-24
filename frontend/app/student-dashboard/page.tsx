'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import Link from 'next/link'
import { Plus, Search, RefreshCcw, LogOut, LayoutDashboard, FolderOpen } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

import { fetchMyProjectsFromAllProjects } from '@/lib/api'
import { ProjectCard } from '@/components/project-card'

type ApiProject = {
  id: number
  title: string
  description: string
  video?: string
  technologies?: string[] | string
  submitted_name?: string
  status?: string
  created_at?: string

  // ✅ NEW: backend thumbnail field (usually "/uploads/xxx.png")
  thumbnail_url?: string | null

  team_members?: Array<{
    id: number
    first_name: string
    last_name: string
    email: string
    role: string
  }>
  categories?: Array<{ id: number; name: string }>
}

type UiProjectCard = {
  id: number
  title: string
  description: string
  image?: string
  technologies: string[] | string
  category: string
  author: string
  views?: number
  rating?: number
  status?: string
}

const CATEGORY_OPTIONS = ['All', 'HealthTech', 'EdTech', 'FinTech', 'AgriTech', 'Other'] as const
type CategoryFilter = (typeof CATEGORY_OPTIONS)[number]

function normalizeTech(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

function normalizeStatus(s?: string) {
  return (s ?? '').trim().toLowerCase()
}

function statusLabel(s?: string) {
  const v = normalizeStatus(s)
  if (v.includes('pend')) return 'Pending'
  if (v.includes('approv') || v.includes('accept')) return 'Approved'
  if (v.includes('reject') || v.includes('declin')) return 'Rejected'
  return s || 'Unknown'
}

function statusBadgeVariant(label: string): 'default' | 'secondary' | 'destructive' {
  const v = label.toLowerCase()
  if (v === 'approved') return 'default'
  if (v === 'pending') return 'secondary'
  if (v === 'rejected') return 'destructive'
  return 'secondary'
}

function LoadingShell() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        {/* Header skeleton */}
        <div className="space-y-3">
          <div className="h-8 w-72 rounded bg-muted animate-pulse" />
          <div className="h-4 w-96 rounded bg-muted animate-pulse" />
          <div className="mt-4 flex gap-3">
            <div className="h-10 w-32 rounded bg-muted animate-pulse" />
            <div className="h-10 w-40 rounded bg-muted animate-pulse" />
            <div className="h-10 w-28 rounded bg-muted animate-pulse" />
          </div>
        </div>

        {/* KPI skeletons */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="h-4 w-24 rounded bg-muted animate-pulse" />
              <div className="mt-3 h-8 w-16 rounded bg-muted animate-pulse" />
            </Card>
          ))}
        </div>

        {/* Filters skeleton */}
        <Card className="mt-8 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-10 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded bg-muted animate-pulse" />
            <div className="h-10 rounded bg-muted animate-pulse" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-4 w-44 rounded bg-muted animate-pulse" />
            <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          </div>
        </Card>

        {/* Grid skeleton */}
        <div className="mt-8">
          <div className="flex items-center justify-between">
            <div className="h-7 w-40 rounded bg-muted animate-pulse" />
            <div className="h-6 w-16 rounded bg-muted animate-pulse" />
          </div>

          <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <Card key={i} className="h-80 p-4">
                <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                <div className="mt-3 h-6 w-2/3 rounded bg-muted animate-pulse" />
                <div className="mt-2 h-4 w-full rounded bg-muted animate-pulse" />
                <div className="mt-2 h-4 w-5/6 rounded bg-muted animate-pulse" />
                <div className="mt-6 h-8 w-32 rounded bg-muted animate-pulse" />
              </Card>
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}

function EmptyState() {
  return (
    <Card className="mt-6 p-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FolderOpen className="h-7 w-7 text-foreground/60" />
        </div>
        <p className="mt-4 text-lg font-semibold">No projects found</p>
        <p className="mt-2 text-sm text-foreground/70">
          Submit your first project to showcase your work. You can also adjust filters to see results.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/submit-project">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Submit Project
            </Button>
          </Link>
          <Link href="/student-dashboard/profile">
            <Button variant="outline">Edit Profile</Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default function StudentDashboard() {
  const { data: session, status } = useSession()

  const [projects, setProjects] = useState<ApiProject[]>([])
  const [loadingProjects, setLoadingProjects] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<CategoryFilter>('All')
  const [tech, setTech] = useState('All')
  const [signingOut, setSigningOut] = useState(false)

  const token = session?.accessToken
  const username = session?.user?.username ?? session?.user?.email?.split('@')?.[0] ?? 'Student'

  const uid = useMemo(() => {
    const n = Number(session?.user?.id)
    return Number.isFinite(n) ? n : null
  }, [session?.user?.id])

  const loadProjects = useCallback(async () => {
    if (uid == null || !token) return

    setLoadingProjects(true)
    setError(null)

    try {
      const mine = await fetchMyProjectsFromAllProjects(uid, token)
      setProjects(Array.isArray(mine) ? (mine as ApiProject[]) : [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load projects')
    } finally {
      setLoadingProjects(false)
    }
  }, [uid, token])

  useEffect(() => {
    if (status !== 'authenticated') return
    loadProjects()
  }, [status, loadProjects])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut({ redirect: true, callbackUrl: '/' })
    } finally {
      setSigningOut(false)
    }
  }

  const allTechOptions = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((p) => normalizeTech(p.technologies).forEach((t) => set.add(t)))
    return ['All', ...Array.from(set)]
  }, [projects])

  const hasActiveFilters = useMemo(() => {
    return Boolean(query.trim() || category !== 'All' || tech !== 'All')
  }, [query, category, tech])

  const clearFilters = () => {
    setQuery('')
    setCategory('All')
    setTech('All')
  }

  const stats = useMemo(() => {
    const total = projects.length
    let pending = 0
    let approved = 0
    let rejected = 0

    for (const p of projects) {
      const v = normalizeStatus(p.status)
      if (v.includes('pend')) pending++
      else if (v.includes('approv') || v.includes('accept')) approved++
      else if (v.includes('reject') || v.includes('declin')) rejected++
    }

    return { total, pending, approved, rejected }
  }, [projects])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return projects.filter((p) => {
      const techs = normalizeTech(p.technologies)
      const catNames = (p.categories ?? []).map((c) => c.name)
      const teamNames = (p.team_members ?? [])
        .map((m) => `${m.first_name} ${m.last_name}`.trim())
        .join(' ')

      const haystack = [p.title, p.description, techs.join(' '), catNames.join(' '), p.submitted_name, teamNames]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesQuery = !q || haystack.includes(q)
      const matchesCategory = category === 'All' ? true : catNames.includes(category)
      const matchesTech = tech === 'All' ? true : techs.includes(tech)

      return matchesQuery && matchesCategory && matchesTech
    })
  }, [projects, query, category, tech])

  const cards: UiProjectCard[] = useMemo(() => {
    return filtered.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      technologies: p.technologies ?? [],
      category: p.categories?.[0]?.name ?? 'Other',
      author: p.submitted_name ?? username,
      views: 0,
      rating: 0,
      image: (p.thumbnail_url ?? '').trim() || undefined,
      status: statusLabel(p.status),
    }))
  }, [filtered, username])

  if (status === 'loading') return <LoadingShell />
  if (!session) return null

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto max-w-6xl px-4 py-10">
        {/* Hero header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground/70">
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-sm">Student Dashboard</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {username} </h1>
            <p className="max-w-2xl text-foreground/70">
              Track your submissions, check review status, and keep your portfolio up to date.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link href="/student-dashboard/profile">
              <Button variant="outline">Edit Profile</Button>
            </Link>

            <Link href="/submit-project">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Submit Project
              </Button>
            </Link>

            <Button variant="outline" className="gap-2" onClick={handleSignOut} disabled={signingOut}>
              <LogOut className="h-4 w-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>

        {/* KPI cards */}
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-foreground/60">Total projects</p>
            <p className="mt-2 text-3xl font-bold">{stats.total}</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-foreground/60">Pending</p>
            <p className="mt-2 text-3xl font-bold">{stats.pending}</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-foreground/60">Approved</p>
            <p className="mt-2 text-3xl font-bold">{stats.approved}</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-foreground/60">Rejected</p>
            <p className="mt-2 text-3xl font-bold">{stats.rejected}</p>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mt-8 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, tech, category, team member…"
                className="pl-9"
              />
            </div>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={category}
              onChange={(e) => setCategory(e.target.value as CategoryFilter)}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              className="h-10 rounded-md border bg-background px-3 text-sm"
              value={tech}
              onChange={(e) => setTech(e.target.value)}
            >
              {allTechOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>

          {/* Active filter chips + actions */}
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {query.trim() ? <Badge variant="secondary">Query: {query.trim()}</Badge> : null}
              {category !== 'All' ? <Badge variant="secondary">Category: {category}</Badge> : null}
              {tech !== 'All' ? <Badge variant="secondary">Tech: {tech}</Badge> : null}
              {!hasActiveFilters ? <span className="text-sm text-foreground/60">No active filters</span> : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters || loadingProjects}>
                Clear
              </Button>

              <Button variant="ghost" size="sm" onClick={loadProjects} className="gap-2" disabled={loadingProjects}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-foreground/60">
            <span>
              Showing <span className="font-medium">{cards.length}</span> projects
            </span>

            <Badge variant="secondary">{loadingProjects ? 'Syncing…' : 'Up to date'}</Badge>
          </div>
        </Card>

        {/* Error */}
        {error && (
          <Card className="mt-6 border border-destructive/30 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-destructive">Couldn’t load projects</p>
                <p className="text-sm text-foreground/70">{error}</p>
              </div>
              <Button onClick={loadProjects}>Try again</Button>
            </div>
          </Card>
        )}

        {/* Projects */}
        <div className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">My Projects</h2>
              <p className="text-sm text-foreground/60">Your submitted projects and their latest review status.</p>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary">{loadingProjects ? 'Loading…' : `${cards.length} results`}</Badge>
            </div>
          </div>

          {loadingProjects ? (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-80 p-4">
                  <div className="h-4 w-24 rounded bg-muted animate-pulse" />
                  <div className="mt-3 h-6 w-2/3 rounded bg-muted animate-pulse" />
                  <div className="mt-2 h-4 w-full rounded bg-muted animate-pulse" />
                  <div className="mt-2 h-4 w-5/6 rounded bg-muted animate-pulse" />
                  <div className="mt-6 h-8 w-32 rounded bg-muted animate-pulse" />
                </Card>
              ))}
            </div>
          ) : cards.length === 0 ? (
            <EmptyState />
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {cards.map((p) => (
                <div key={p.id} className="relative">
                  {/* Status chip */}
                  <div className="absolute right-3 top-3 z-10">
                    <Badge variant={statusBadgeVariant(p.status ?? 'Unknown')}>{p.status}</Badge>
                  </div>

                  <ProjectCard
                    id={p.id}
                    title={p.title}
                    description={p.description}
                    image={p.image}
                    technologies={p.technologies}
                    category={p.category}
                    author={p.author}
                    views={p.views}
                    rating={p.rating}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
