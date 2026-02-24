'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import { BriefcaseBusiness, Calendar, Copy, FolderSearch, Globe, Mail, Users } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || ''

type BackendTeamMember = {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
}

type BackendCategory = { id: number; name: string }

type BackendProject = {
  id: number
  title: string
  description: string
  video: string
  technologies: string
  submitted_name: string
  status: 'approved' | 'pending' | 'rejected'
  created_at: string
  team_members: BackendTeamMember[]
  categories: BackendCategory[]

  thumbnail_url?: string | null
}

const FALLBACK_IMAGES = [
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735910/%D8%AF%D9%8A%D8%AC%D9%8A%D8%AA%D8%A7%D9%84_%D9%83%D8%A7%D8%B1%D8%AF_rmval4.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735912/Self_Productivity_jogxol.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735916/Ai-%D1%85%D1%83%D0%B4%D0%BE%D0%B6%D0%BD%D0%B8%D0%BA_h7wj5r.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735910/Friendly_Futuristic_Robot_wbvmbh.jpg',
  'https://res.cloudinary.com/drxd3fs4g/image/upload/v1770735909/download_2_eeb4ac.jpg',
]

function resolveProjectImage(src?: string | null) {
  const s = (src || '').trim()
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE
  return `${base}${s}`
}

function parseTechnologies(raw: string): string[] {
  if (!raw) return []
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

function formatDate(value: string) {
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toLocaleDateString()
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20'
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20'
    case 'rejected':
      return 'bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20'
    default:
      return 'bg-muted text-foreground/70'
  }
}

function isProbablyUrl(value?: string) {
  if (!value) return false
  try {
    const u = new URL(value)
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}

async function fetchAllProjects(): Promise<BackendProject[]> {
  const res = await fetch(`${BASE}/projects`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch projects (${res.status})`)
  return res.json()
}

async function contactProjectTeam(projectId: number, subject: string, message: string) {
  const res = await fetch(`${BASE}/projects/${projectId}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // If you later require JWT on this endpoint, add Authorization header here.
    body: JSON.stringify({ subject, message }),
  })

  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) {
    throw new Error(data?.error || 'Failed to send message')
  }
  return data as { ok: true; sent_to: number }
}

export default function ProjectDetailPage() {
  const params = useParams<{ id: string }>()
  const projectId = Number(params.id)

  const { toast } = useToast()

  const [projects, setProjects] = useState<BackendProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [copiedLink, setCopiedLink] = useState(false)
  const [hireOpen, setHireOpen] = useState(false)

  // Hire composer state
  const [hireSubject, setHireSubject] = useState('')
  const [hireMessage, setHireMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await fetchAllProjects()
        setProjects(data)
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [])

  const project = useMemo(() => {
    if (!Number.isFinite(projectId)) return undefined
    return projects.find((p) => p.id === projectId)
  }, [projects, projectId])

  // Prefill subject when project resolves
  useEffect(() => {
    if (!project) return
    setHireSubject((prev) => (prev.trim() ? prev : `Hiring inquiry: ${project.title}`))
  }, [project])

  const technologies = useMemo(() => parseTechnologies(project?.technologies ?? ''), [project?.technologies])

  const categoryLabel = project?.categories?.[0]?.name ?? 'Other'
  const team = project?.team_members ?? []
  const teamSize = team.length

  const statusLabel = project?.status ? project.status.charAt(0).toUpperCase() + project.status.slice(1) : ''

  const demoLink = project && isProbablyUrl(project.video) ? project.video : undefined

  const shortDescription = useMemo(() => {
    const text = (project?.description ?? '').trim()
    if (!text) return ''
    return text.length > 180 ? text.slice(0, 180).trim() + '…' : text
  }, [project?.description])

  const teamEmails = useMemo(() => {
    const emails = (project?.team_members ?? [])
      .map((m) => (m.email ?? '').trim())
      .filter(Boolean)
    return Array.from(new Set(emails))
  }, [project?.team_members])

  const fallback = useMemo(() => {
    const index = Math.floor(Math.random() * FALLBACK_IMAGES.length)
    return FALLBACK_IMAGES[index]
  }, [])

  const heroImage = useMemo(() => {
    const resolved = resolveProjectImage(project?.thumbnail_url)
    return resolved || fallback
  }, [project?.thumbnail_url, fallback])

  const onCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href)
      setCopiedLink(true)
      window.setTimeout(() => setCopiedLink(false), 1500)
      toast({ title: 'Link copied', description: 'You can share this project with others.' })
    } catch {
      toast({
        title: 'Copy failed',
        description: 'Your browser blocked clipboard access.',
        variant: 'destructive',
      })
    }
  }

  const onHireClick = () => {
    if (!project) return

    if (teamEmails.length === 0) {
      toast({
        title: 'No contact info available',
        description: 'This project does not include team emails yet.',
        variant: 'destructive',
      })
      return
    }

    // Prefill message if empty
    setHireMessage((prev) => {
      if (prev.trim()) return prev
      return (
        `Hi ${project.submitted_name ?? 'Team'},\n\n` +
        `I’m interested in your project "${project.title}".\n` +
        `Could we schedule a quick call to discuss availability, timeline, and next steps?\n\n` +
        `Thanks,\nRecruiter`
      )
    })

    setHireOpen(true)
  }

  const onSendHireMessage = async () => {
    if (!project) return

    const subject = hireSubject.trim()
    const message = hireMessage.trim()

    if (!subject) {
      toast({ title: 'Subject required', description: 'Please add a subject.', variant: 'destructive' })
      return
    }
    if (!message) {
      toast({ title: 'Message required', description: 'Please type a message.', variant: 'destructive' })
      return
    }

    try {
      setSending(true)
      const out = await contactProjectTeam(project.id, subject, message)
      toast({ title: 'Message sent', description: `Sent to ${out.sent_to} team member(s).` })
      setHireOpen(false)
      setHireMessage('')
    } catch (e: any) {
      toast({
        title: 'Send failed',
        description: e?.message ?? 'Could not send message',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
            <p className="text-foreground/60">Loading project…</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
            <h2 className="text-2xl font-bold">Could not load project</h2>
            <p className="text-foreground/60 mt-2">{error}</p>
            <div className="mt-6">
              <Button variant="outline" onClick={() => location.reload()}>
                Retry
              </Button>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main>
          <div className="mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-muted">
              <FolderSearch className="h-7 w-7 text-foreground/60" />
            </div>
            <h2 className="mt-4 text-2xl font-bold">Project not found</h2>
            <p className="text-foreground/60 mt-2">The project you're looking for doesn't exist.</p>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main>
        {/* HERO */}
        <section className="relative overflow-hidden border-b border-border">
          <div className="absolute inset-0 bg-gradient-to-b from-primary/10 via-background to-background" />
          <div className="pointer-events-none absolute -top-24 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-primary/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 left-12 h-64 w-64 rounded-full bg-accent/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-24 right-12 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />

          <div className="relative mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
            <div className="grid gap-8 lg:grid-cols-3 lg:items-start">
              {/* Left: text */}
              <div className="lg:col-span-2 max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs">
                    {categoryLabel}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={`rounded-full px-3 py-1 text-xs border ${getStatusBadgeVariant(project.status)}`}
                  >
                    {statusLabel}
                  </Badge>
                </div>

                <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">{project.title}</h1>
                <p className="mt-3 text-base text-foreground/60 sm:text-lg">{shortDescription}</p>

                <div className="mt-5 flex flex-wrap gap-4 text-sm text-foreground/60">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                    <span>Submitted {formatDate(project.created_at)}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span>{teamSize} team members</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span>Submitted by {project.submitted_name}</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="mt-6 flex flex-wrap items-center gap-3">
                  <Button onClick={onHireClick}>
                    <BriefcaseBusiness className="mr-2 h-4 w-4" />
                    Contact / Hire
                  </Button>

                  {demoLink && (
                    <a href={demoLink} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline">
                        <Globe className="mr-2 h-4 w-4" />
                        Demo
                      </Button>
                    </a>
                  )}

                  <Button variant="outline" onClick={onCopyLink}>
                    <Copy className="mr-2 h-4 w-4" />
                    {copiedLink ? 'Copied' : 'Share'}
                  </Button>
                </div>
              </div>

              {/* Right: thumbnail */}
              <div className="lg:col-span-1">
                <Card className="overflow-hidden border-border/60 bg-background/70 backdrop-blur">
                  <div className="relative aspect-video w-full bg-muted">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={heroImage}
                      alt={`${project.title} preview`}
                      className="h-full w-full object-cover"
                      loading="lazy"
                      onError={(e) => {
                        ; (e.currentTarget as HTMLImageElement).src = fallback
                      }}
                    />
                    <div
                      className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-transparent"
                      aria-hidden="true"
                    />
                    <div className="absolute left-3 top-3">
                      <Badge variant="secondary" className="rounded-full bg-white/90 text-gray-900">
                        Preview
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <p className="text-sm font-medium">Project thumbnail</p>
                    <p className="mt-1 text-xs text-foreground/60">Uploaded by the student during submission.</p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* MAIN CONTENT */}
        <section className="py-12">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 md:grid-cols-3">
              {/* Left content */}
              <div className="md:col-span-2 space-y-10">
                {/* About */}
                <div id="about" className="scroll-mt-28 space-y-4">
                  <h2 className="text-2xl font-bold sm:text-3xl">About this project</h2>
                  <Card className="border-border/60 bg-background/70 p-6 backdrop-blur">
                    <p className="text-foreground/70 whitespace-pre-line leading-relaxed">{project.description}</p>
                  </Card>
                </div>

                {/* Technologies */}
                <div className="space-y-4">
                  <h2 className="text-xl font-bold sm:text-2xl">Technologies used</h2>
                  <Card className="border-border/60 bg-background/70 p-6 backdrop-blur">
                    <div className="flex flex-wrap gap-2">
                      {technologies.length > 0 ? (
                        technologies.map((tech) => (
                          <Badge key={tech} variant="secondary" className="rounded-full bg-secondary/20">
                            {tech}
                          </Badge>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground">No technologies listed.</p>
                      )}
                    </div>
                  </Card>
                </div>

                {/* Demo link section */}
                {demoLink && (
                  <div className="space-y-4">
                    <h2 className="text-xl font-bold sm:text-2xl">Demo</h2>
                    <Card className="border-border/60 bg-background/70 p-6 backdrop-blur">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                        <div className="text-sm text-foreground/60">Open the project demo/video in a new tab.</div>
                        <a href={demoLink} target="_blank" rel="noopener noreferrer">
                          <Button>
                            <Globe className="mr-2 h-4 w-4" />
                            View demo
                          </Button>
                        </a>
                      </div>
                    </Card>
                  </div>
                )}
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                {/* Team */}
                <Card className="border-border/60 bg-background/70 p-6 backdrop-blur">
                  <h3 className="font-bold text-lg">Development team</h3>

                  {team.length > 0 ? (
                    <div className="mt-4 space-y-3">
                      {team.map((m) => {
                        const fullName = `${m.first_name} ${m.last_name}`.trim()
                        return (
                          <div
                            key={m.id}
                            className="flex items-center gap-3 rounded-lg border border-border/60 bg-background p-3"
                          >
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/15 text-sm font-bold">
                              {(m.first_name?.[0] ?? m.email?.[0] ?? '?').toUpperCase()}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium">{fullName || m.email}</p>
                              <p className="text-xs text-muted-foreground">{m.role}</p>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="mt-3 text-sm text-muted-foreground">No team members listed.</p>
                  )}
                </Card>

                {/* Categories */}
                <Card className="border-border/60 bg-background/70 p-6 backdrop-blur">
                  <h3 className="font-bold text-lg">Categories</h3>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {project.categories?.length ? (
                      project.categories.map((c) => (
                        <Badge key={c.id} variant="secondary" className="rounded-full bg-secondary/20">
                          {c.name}
                        </Badge>
                      ))
                    ) : (
                      <p className="text-sm text-muted-foreground">No categories assigned.</p>
                    )}
                  </div>
                </Card>

                {/* Contact teaser */}
                <Card className="border-border/60 bg-background/70 p-6 backdrop-blur">
                  <h3 className="font-bold text-lg">Work with this team</h3>
                  <p className="mt-2 text-sm text-foreground/60">
                    Reach out to the developers directly to discuss hiring, collaboration, or next steps.
                  </p>
                  <div className="mt-4">
                    <Button className="w-full" onClick={onHireClick}>
                      <BriefcaseBusiness className="mr-2 h-4 w-4" />
                      Contact / Hire
                    </Button>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>

        {/* HIRE MODAL (FIXED LAYOUT) */}
        <Dialog open={hireOpen} onOpenChange={setHireOpen}>
          <DialogTrigger asChild>
            <span className="hidden" />
          </DialogTrigger>

          <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
            {/* Header */}
            <div className="px-6 pt-6">
              <DialogHeader>
                <DialogTitle>Contact the team</DialogTitle>
              </DialogHeader>
            </div>

            {/* Body */}
            <div className="px-6 pb-4 pt-4 space-y-4">
              <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm text-foreground/70">
                Your message will be sent to <span className="font-semibold">{teamEmails.length}</span> team member
                {teamEmails.length === 1 ? '' : 's'} automatically.
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <input
                  value={hireSubject}
                  onChange={(e) => setHireSubject(e.target.value)}
                  className="w-full rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder={`Hiring inquiry: ${project.title}`}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <textarea
                  value={hireMessage}
                  onChange={(e) => setHireMessage(e.target.value)}
                  className="min-h-[160px] w-full resize-none rounded-md border border-border/60 bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/30"
                  placeholder="Type your message..."
                />
              </div>

              {/* <div className="rounded-lg border border-border/60 bg-muted/20 p-4 text-xs text-foreground/60">
                This sends via your backend (Resend). No redirect, no mailto.
              </div> */}
            </div>

            {/* Footer (buttons) */}
            <div className="px-6 py-4 border-t border-border/60 bg-background/80">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  className="flex-1 min-w-0"
                  onClick={() => setHireOpen(false)}
                  disabled={sending}
                >
                  Cancel
                </Button>

                <Button className="flex-1 min-w-0" onClick={onSendHireMessage} disabled={sending}>
                  <Mail className="mr-2 h-4 w-4" />
                  {sending ? 'Sending…' : 'Send'}
                </Button>
              </div>
            </div>

          </DialogContent>
        </Dialog>

      </main>

      <Footer />
    </div>
  )
}
