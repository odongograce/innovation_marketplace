'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { ArrowRight, RefreshCcw } from 'lucide-react'

import { ProjectCard } from './project-card'
import { Button } from '@/components/ui/button'
import { fetchFeaturedProjects, type ProjectCardVM } from '@/lib/api/projects'

function ProjectSkeletonCard() {
  return (
    <div className="h-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur">
      <div className="h-44 w-full animate-pulse bg-white/10" />
      <div className="space-y-3 p-5">
        <div className="h-4 w-3/4 animate-pulse rounded bg-white/10" />
        <div className="h-4 w-full animate-pulse rounded bg-white/10" />
        <div className="h-4 w-5/6 animate-pulse rounded bg-white/10" />
        <div className="flex gap-2 pt-2">
          <div className="h-6 w-16 animate-pulse rounded bg-white/10" />
          <div className="h-6 w-20 animate-pulse rounded bg-white/10" />
          <div className="h-6 w-14 animate-pulse rounded bg-white/10" />
        </div>
      </div>
    </div>
  )
}

export function FeaturedProjects() {
  const { data: session } = useSession()
  const router = useRouter()

  const [projects, setProjects] = useState<ProjectCardVM[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    setError(null)
    try {
      // Always fetch 3
      const data = await fetchFeaturedProjects(3)

      // Ensure max 3 rendered
      setProjects(data.slice(0, 3))
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load featured projects.')
      setProjects([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleViewAllProjects = () => {
    if (!session) {
      const callbackUrl = window.location.pathname
      router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
      return
    }
    router.push('/projects')
  }

  return (
    <section className="relative overflow-hidden py-20 md:py-28">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1517077304055-6e89abbf09b0?auto=format&fit=crop&w=1920&q=80')",
        }}
        aria-hidden="true"
      />

      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />
      <div
        className="absolute inset-0 bg-gradient-to-b from-black/25 via-black/60 to-black/90"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="space-y-10">
          {/* Header */}
          <div className="max-w-2xl space-y-3">
            <p className="inline-flex w-fit items-center rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-100">
              Featured
            </p>

            <h2 className="text-4xl font-semibold tracking-tight text-slate-100">
              Featured <span className="text-yellow-400">Projects</span>
            </h2>

            <p className="text-lg text-slate-200/85">
              Discover the most innovative student-built solutions on our platform.
            </p>
          </div>

          {/* Content */}
          {loading ? (
            <div className="grid gap-8 auto-rows-fr md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <ProjectSkeletonCard key={i} />
              ))}
            </div>
          ) : error ? (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-6 text-slate-100 backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold">Couldn’t load featured projects</p>
                  <p className="text-sm text-slate-200/80">{error}</p>
                </div>
                <Button
                  variant="outline"
                  className="border-yellow-400/30 bg-yellow-400/10 text-yellow-100 hover:bg-yellow-400/15"
                  onClick={load}
                >
                  <RefreshCcw className="mr-2 h-4 w-4" />
                  Retry
                </Button>
              </div>
            </div>
          ) : projects.length === 0 ? (
            <div className="rounded-2xl border border-white/15 bg-white/10 p-8 text-center text-slate-100 backdrop-blur">
              <p className="font-semibold">No approved projects yet</p>
              <p className="mt-1 text-sm text-slate-200/80">
                Once projects are approved, they’ll show up here.
              </p>
            </div>
          ) : (
            <div className="grid gap-8 auto-rows-fr md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project) => (
                <div key={project.id} className="group relative h-full">
                  <div
                    className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary/25 via-yellow-400/12 to-accent/25 opacity-0 blur-xl transition-opacity duration-300 group-hover:opacity-100"
                    aria-hidden="true"
                  />
                  <div className="relative h-full transition-transform duration-300 group-hover:-translate-y-1">
                    <ProjectCard {...project} variant="featuredDark" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* CTA */}
          {/* <div className="flex justify-center pt-2">
            <Button
              size="lg"
              variant="outline"
              className="group border-yellow-400/35 bg-yellow-400/10 text-yellow-50 hover:bg-yellow-400/15"
              onClick={handleViewAllProjects}
            >
              View All Projects
              <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1"
              />
            </Button>
          </div> */}
        </div>
      </div>
    </section>
  )
}
