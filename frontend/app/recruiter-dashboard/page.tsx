'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useSession, signOut } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Search,
  RefreshCcw,
  LogOut,
  ExternalLink,
  LayoutDashboard,
  FolderSearch,
} from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'

import { fetchApprovedProjects } from '@/lib/api'
import { ProjectCard } from '@/components/project-card'

type ApprovedProject = {
  id: number
  title: string
  description: string
  technologies?: string[] | string
  submitted_name?: string

  // ✅ IMPORTANT: this is what makes images consistent
  // Backend may return thumbnail_url (recommended)
  thumbnail_url?: string

  // Some endpoints may already use "image" instead
  image?: string

  // Optional: if recruiters endpoint includes categories/team
  categories?: Array<{ id: number; name: string }>
  team_members?: Array<{ id: number; name: string }>
}

function normalizeTech(value: unknown): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String).filter(Boolean)
  if (typeof value === 'string') return value.split(',').map((s) => s.trim()).filter(Boolean)
  return []
}

function LoadingShell() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="space-y-3">
          <div className="h-8 w-72 rounded bg-muted animate-pulse" />
          <div className="h-4 w-[520px] max-w-full rounded bg-muted animate-pulse" />
          <div className="mt-4 flex gap-3">
            <div className="h-10 w-40 rounded bg-muted animate-pulse" />
            <div className="h-10 w-28 rounded bg-muted animate-pulse" />
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} className="p-4">
              <div className="h-4 w-28 rounded bg-muted animate-pulse" />
              <div className="mt-3 h-8 w-20 rounded bg-muted animate-pulse" />
              <div className="mt-3 h-4 w-full rounded bg-muted animate-pulse" />
            </Card>
          ))}
        </div>

        <Card className="mt-8 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-10 rounded bg-muted animate-pulse md:col-span-2" />
            <div className="h-10 rounded bg-muted animate-pulse" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-4 w-44 rounded bg-muted animate-pulse" />
            <div className="h-8 w-24 rounded bg-muted animate-pulse" />
          </div>
        </Card>

        <div className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
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
      </main>
      <Footer />
    </div>
  )
}

function EmptyState({ onClear }: { onClear: () => void }) {
  return (
    <Card className="mt-6 p-10">
      <div className="mx-auto flex max-w-xl flex-col items-center text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-muted">
          <FolderSearch className="h-7 w-7 text-foreground/60" />
        </div>
        <p className="mt-4 text-lg font-semibold">No projects found</p>
        <p className="mt-2 text-sm text-foreground/70">
          Try changing your search terms or selecting a different technology filter.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Button variant="outline" onClick={onClear}>
            Clear filters
          </Button>
          <Link href="/projects">
            <Button>
              <ExternalLink className="mr-2 h-4 w-4" />
              Browse public projects
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  )
}

export default function RecruiterDashboard() {
  const { data: session, status } = useSession()
  const router = useRouter()

  const [projects, setProjects] = useState<ApprovedProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [query, setQuery] = useState('')
  const [tech, setTech] = useState('All')

  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'recruiter') router.replace('/')
  }, [session, status, router])

  const loadApprovedProjects = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await fetchApprovedProjects()
      setProjects(Array.isArray(data) ? data : [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load projects')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!session || session.user.role !== 'recruiter') return
    loadApprovedProjects()
  }, [session, loadApprovedProjects])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await signOut({ redirect: false })
      router.replace('/')
      router.refresh()
    } finally {
      setSigningOut(false)
    }
  }

  const allTechOptions = useMemo(() => {
    const set = new Set<string>()
    projects.forEach((p) => normalizeTech(p.technologies).forEach((t) => set.add(t)))
    return ['All', ...Array.from(set)]
  }, [projects])

  const hasActiveFilters = useMemo(() => Boolean(query.trim() || tech !== 'All'), [query, tech])
  const clearFilters = () => {
    setQuery('')
    setTech('All')
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()

    return projects.filter((p) => {
      const techs = normalizeTech(p.technologies)
      const team = (p.team_members ?? []).map((m) => m.name).join(' ')

      const haystack = [p.title, p.description, techs.join(' '), p.submitted_name, team]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      const matchesQuery = !q || haystack.includes(q)
      const matchesTech = tech === 'All' ? true : techs.includes(tech)

      return matchesQuery && matchesTech
    })
  }, [projects, query, tech])

  const stats = useMemo(() => {
    const total = projects.length
    const uniqueStudents = new Set<string>()
    const techSet = new Set<string>()

    projects.forEach((p) => {
      if (p.submitted_name) uniqueStudents.add(p.submitted_name)
      normalizeTech(p.technologies).forEach((t) => techSet.add(t))
    })

    return {
      total,
      students: uniqueStudents.size,
      technologies: techSet.size,
      results: filtered.length,
    }
  }, [projects, filtered.length])

  if (status === 'loading') return <LoadingShell />
  if (!session || session.user.role !== 'recruiter') return null

  const recruiterName = session.user.username ?? session.user.email?.split('@')?.[0] ?? 'Recruiter'

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto max-w-6xl px-4 py-10">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-foreground/70">
              <LayoutDashboard className="h-4 w-4" />
              <span className="text-sm">Recruiter Dashboard</span>
            </div>

            <h1 className="text-3xl font-bold tracking-tight">Welcome back, {recruiterName}</h1>
            <p className="max-w-2xl text-foreground/70">
              Browse approved projects, evaluate stacks, and contact teams to hire faster.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            {/* <Link href="/projects">
              <Button variant="outline" className="gap-2">
                <ExternalLink className="h-4 w-4" />
                Public Projects
              </Button>
            </Link> */}

            <Button variant="outline" className="gap-2" onClick={handleSignOut} disabled={signingOut}>
              <LogOut className="h-4 w-4" />
              {signingOut ? 'Signing out…' : 'Sign out'}
            </Button>
          </div>
        </div>

        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Card className="p-4">
            <p className="text-sm text-foreground/60">Approved projects</p>
            <p className="mt-2 text-3xl font-bold">{stats.total}</p>
            <p className="mt-2 text-sm text-foreground/70">Curated submissions ready to review.</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-foreground/60">Results</p>
            <p className="mt-2 text-3xl font-bold">{stats.results}</p>
            <p className="mt-2 text-sm text-foreground/70">Matches your current filters.</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-foreground/60">Students</p>
            <p className="mt-2 text-3xl font-bold">{stats.students}</p>
            <p className="mt-2 text-sm text-foreground/70">Unique submitters in this list.</p>
          </Card>

          <Card className="p-4">
            <p className="text-sm text-foreground/60">Technologies</p>
            <p className="mt-2 text-3xl font-bold">{stats.technologies}</p>
            <p className="mt-2 text-sm text-foreground/70">Distinct tech tags detected.</p>
          </Card>
        </div>

        <Card className="mt-8 p-4">
          <div className="grid gap-3 md:grid-cols-3">
            <div className="relative md:col-span-2">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title, tech, student/team member…"
                className="pl-9"
              />
            </div>

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

          <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {query.trim() ? <Badge variant="secondary">Query: {query.trim()}</Badge> : null}
              {tech !== 'All' ? <Badge variant="secondary">Tech: {tech}</Badge> : null}
              {!hasActiveFilters ? <span className="text-sm text-foreground/60">No active filters</span> : null}
            </div>

            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={clearFilters} disabled={!hasActiveFilters || loading}>
                Clear
              </Button>

              <Button variant="ghost" size="sm" onClick={loadApprovedProjects} className="gap-2" disabled={loading}>
                <RefreshCcw className="h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm text-foreground/60">
            <span>
              Showing <span className="font-medium">{filtered.length}</span> of{' '}
              <span className="font-medium">{projects.length}</span>
            </span>
            <Badge variant="secondary">{loading ? 'Syncing…' : 'Up to date'}</Badge>
          </div>
        </Card>

        {error && (
          <Card className="mt-6 border border-destructive/30 p-5">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="font-semibold text-destructive">Couldn’t load projects</p>
                <p className="text-sm text-foreground/70">{error}</p>
              </div>
              <Button onClick={loadApprovedProjects}>Try again</Button>
            </div>
          </Card>
        )}

        <div className="mt-10">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold">Approved Projects</h2>
              <p className="text-sm text-foreground/60">Reviewed projects ready for talent evaluation.</p>
            </div>
            <Badge variant="secondary">{loading ? 'Loading…' : `${filtered.length} results`}</Badge>
          </div>

          {loading ? (
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
          ) : filtered.length === 0 ? (
            <EmptyState onClear={clearFilters} />
          ) : (
            <div className="mt-6 grid gap-6 md:grid-cols-2 lg:grid-cols-3 auto-rows-fr">
              {filtered.map((p) => {
                const techs = normalizeTech(p.technologies)
                const author = p.submitted_name ?? 'Student'

                const image = (p.thumbnail_url ?? p.image ?? '').trim() || undefined

                const category =
                  (p.categories && p.categories[0] && p.categories[0].name) ? p.categories[0].name : 'Approved'

                return (
                  <div key={p.id} className="space-y-3">
                    <ProjectCard
                      id={p.id}
                      title={p.title}
                      description={p.description}
                      image={image}
                      technologies={techs}
                      category={category}
                      author={author}
                    />
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
