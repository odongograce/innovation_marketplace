'use client'

import { useEffect, useMemo, useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { useToast } from '@/components/ui/use-toast'
import { Mail, Search, RefreshCcw, Star } from 'lucide-react'
import { fetchProjects } from '@/lib/api'

const BASE = process.env.NEXT_PUBLIC_BASE_URL || ''
const DEFAULT_AVATAR = '👤'

interface Talent {
  id: string | number
  name: string
  role: string
  email?: string
  avatar: string
  bio: string
  skills: string[]
  projects: number
  rating: number
  github?: string
  linkedin?: string
}

interface Project {
  id: string | number
  team_members?: Array<{
    id: string | number
    first_name: string
    last_name: string
    role?: string
    email?: string
  }>
}

async function contactTalent(userId: string | number, subject: string, message: string) {
  const res = await fetch(`${BASE}/users/${userId}/contact`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ subject, message }),
  })

  const data = await res.json().catch(() => ({} as any))
  if (!res.ok) throw new Error(data?.error || 'Failed to send message')
  return data as { ok: true; sent_to: number }
}

function SkeletonTalentCard() {
  return (
    <div className="overflow-hidden rounded-2xl border bg-card shadow-sm">
      <div className="p-6 space-y-4">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-muted animate-pulse" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/3 bg-muted rounded animate-pulse" />
            <div className="h-3 w-1/2 bg-muted rounded animate-pulse" />
          </div>
        </div>

        <div className="h-3 w-full bg-muted rounded animate-pulse" />
        <div className="h-3 w-5/6 bg-muted rounded animate-pulse" />

        <div className="flex flex-wrap gap-2 pt-1">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-6 w-16 rounded-full bg-muted animate-pulse" />
          ))}
        </div>

        <div className="flex gap-2 pt-2">
          <div className="h-9 flex-1 rounded-md bg-muted animate-pulse" />
          <div className="h-9 w-10 rounded-md bg-muted animate-pulse" />
        </div>
      </div>
    </div>
  )
}

function roleFromRaw(raw?: string) {
  const r = (raw || '').toLowerCase()
  if (!r) return 'Developer'
  if (r.includes('frontend')) return 'Frontend Developer'
  if (r.includes('backend')) return 'Backend Developer'
  if (r.includes('full')) return 'Full Stack Developer'
  if (r.includes('mobile')) return 'Mobile Developer'
  if (r.includes('devops')) return 'DevOps Engineer'
  if (r.includes('ml') || r.includes('ai')) return 'AI/ML Engineer'
  return raw
}

function defaultSkillsFromRole(role: string) {
  if (role.includes('Frontend')) return ['React', 'Next.js', 'Tailwind', 'UI/UX']
  if (role.includes('Backend')) return ['Python', 'Flask', 'SQLAlchemy', 'REST APIs']
  if (role.includes('Full Stack')) return ['React', 'Python', 'Flask', 'PostgreSQL']
  if (role.includes('Mobile')) return ['Flutter', 'Firebase', 'APIs']
  if (role.includes('DevOps')) return ['Docker', 'CI/CD', 'AWS']
  if (role.includes('AI/ML')) return ['Python', 'Pandas', 'ML', 'Data']
  return ['JavaScript', 'Git', 'APIs']
}

function HireDialog({ talent }: { talent: Talent }) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)

  const [subject, setSubject] = useState('')
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)

  useEffect(() => {
    if (!open) return
    setSubject((prev) => (prev.trim() ? prev : `Hiring inquiry: ${talent.name}`))
    setMessage((prev) => {
      if (prev.trim()) return prev
      return (
        `Hi ${talent.name},\n\n` +
        `I came across your profile on Moringa Innovation Marketplace and would love to discuss an opportunity.\n\n` +
        `Thanks,\nRecruiter`
      )
    })
  }, [open, talent.name])

  const onSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()

    if (!talent.email) {
      toast({
        title: 'No contact email',
        description: 'This talent has no contact email available.',
        variant: 'destructive',
      })
      return
    }

    const s = subject.trim()
    const m = message.trim()

    if (!s) {
      toast({ title: 'Subject required', description: 'Please add a subject.', variant: 'destructive' })
      return
    }
    if (!m) {
      toast({ title: 'Message required', description: 'Please type a message.', variant: 'destructive' })
      return
    }

    try {
      setSending(true)
      await contactTalent(talent.id, s, m)
      toast({ title: 'Message sent', description: `Sent to ${talent.name}.` })
      setOpen(false)
      setMessage('')
    } catch (err: any) {
      toast({
        title: 'Send failed',
        description: err?.message ?? 'Could not send message',
        variant: 'destructive',
      })
    } finally {
      setSending(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="flex-1 bg-primary text-primary-foreground hover:bg-primary/90">
          <Mail className="mr-2 h-4 w-4" />
          Hire
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg p-0 overflow-hidden">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>Hire {talent.name}</DialogTitle>
          </DialogHeader>
        </div>

        <form onSubmit={onSend}>
          <div className="px-6 pb-4 pt-4 space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/10 p-4 text-sm text-foreground/70">
              Recipient: <span className="font-medium">{talent.email}</span>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Subject</label>
              <Input
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder={`Hiring inquiry: ${talent.name}`}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Message</label>
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="min-h-[140px]"
                placeholder="Type your message..."
              />
            </div>
          </div>

          <div className="px-6 py-4 border-t border-border/60 bg-background/80">
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1 min-w-0"
                onClick={() => setOpen(false)}
                disabled={sending}
              >
                Cancel
              </Button>

              <Button type="submit" className="flex-1 min-w-0" disabled={sending}>
                <Mail className="mr-2 h-4 w-4" />
                {sending ? 'Sending…' : 'Send'}
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export default function TalentsPage() {
  const [talents, setTalents] = useState<Talent[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState('All')
  const { toast } = useToast()

  const ROLES = useMemo(
    () => [
      'All',
      'Full Stack Developer',
      'Frontend Developer',
      'Backend Developer',
      'Mobile Developer',
      'AI/ML Engineer',
      'DevOps Engineer',
      'Developer',
    ],
    []
  )

  const load = async () => {
    setLoading(true)
    try {
      const projects = (await fetchProjects()) as Project[]
      const map: Record<string, Talent> = {}

      projects.forEach((p) => {
        ;(p.team_members || []).forEach((m) => {
          const id = String(m.id)
          if (!map[id]) {
            const role = roleFromRaw(m.role) || 'Developer'
            map[id] = {
              id: m.id,
              name: `${m.first_name} ${m.last_name}`,
              role,
              email: m.email,
              avatar: DEFAULT_AVATAR,
              bio: '',
              skills: defaultSkillsFromRole(role),
              projects: 0,
              rating: 4.6,
            }
          }
          map[id].projects += 1
        })
      })

      setTalents(Object.values(map))
    } catch {
      toast({ title: 'Failed to load talents' })
      setTalents([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const filteredTalents = useMemo(() => {
    const q = search.trim().toLowerCase()

    return talents.filter((t) => {
      const matchesSearch =
        !q ||
        t.name.toLowerCase().includes(q) ||
        (t.skills || []).some((s) => s.toLowerCase().includes(q))

      const matchesFilter = filter === 'All' || t.role === filter
      return matchesSearch && matchesFilter
    })
  }, [talents, search, filter])

  return (
    <div className="min-h-screen">
      <Navbar />

      <main>
        {/* Header */}
        <section className="relative overflow-hidden border-b border-border py-12">
          <div className="absolute inset-0 bg-gradient-to-b from-black via-black/80 to-background" aria-hidden="true" />
          <div
            className="absolute inset-0 opacity-70"
            aria-hidden="true"
            style={{
              backgroundImage:
                "radial-gradient(900px circle at 15% 20%, rgba(250,204,21,0.12), transparent 55%), radial-gradient(900px circle at 75% 30%, rgba(99,102,241,0.14), transparent 55%)",
            }}
          />

          <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl space-y-3">
              <p className="inline-flex w-fit items-center rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-100 backdrop-blur">
                Talent directory
              </p>
              <h1 className="text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl font-display">
                Find talented developers
              </h1>
              <p className="text-base text-slate-200/80 sm:text-lg">
                Discover and reach out to Moringa students for your next project.
              </p>
            </div>
          </div>
        </section>

        {/* Filters */}
        <section className="sticky top-16 z-40 border-b border-border bg-background/85 backdrop-blur">
          <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
            <Card className="border-border/60 bg-card/70 p-4 shadow-sm backdrop-blur">
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div className="relative w-full md:max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground/50" />
                  <Input
                    className="pl-9"
                    placeholder="Search by name or skill..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Button variant="outline" onClick={load}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Refresh
                  </Button>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {ROLES.map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={filter === role ? 'default' : 'outline'}
                    className={filter === role ? 'bg-primary text-primary-foreground' : ''}
                    onClick={() => setFilter(role)}
                  >
                    {role}
                  </Button>
                ))}
              </div>
            </Card>
          </div>
        </section>

        {/* Grid */}
        <section className="py-10">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            {loading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonTalentCard key={i} />
                ))}
              </div>
            ) : filteredTalents.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredTalents.map((talent) => {
                  const skills = talent.skills || []
                  const shownSkills = skills.slice(0, 6)
                  const extra = Math.max(0, skills.length - shownSkills.length)

                  return (
                    <Card
                      key={talent.id}
                      className="group relative overflow-hidden rounded-2xl border bg-card shadow-sm transition hover:-translate-y-1 hover:shadow-xl"
                    >
                      <div
                        className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary/10 via-yellow-400/10 to-accent/10 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                        aria-hidden="true"
                      />

                      <div className="relative p-6 space-y-4">
                        <div className="flex items-start gap-4">
                          <div className="relative">
                            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border bg-muted text-3xl">
                              {talent.avatar || DEFAULT_AVATAR}
                            </div>
                            <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full border bg-background px-2 py-0.5 text-[11px] font-medium text-foreground/70">
                              {talent.projects} proj
                            </span>
                          </div>

                          <div className="min-w-0 flex-1 space-y-1">
                            <h3 className="truncate text-lg font-semibold font-display">{talent.name}</h3>
                            <p className="text-sm font-medium text-yellow-600 dark:text-yellow-300">{talent.role}</p>

                            <div className="flex items-center gap-2 text-xs text-foreground/60 pt-1">
                              <span className="inline-flex items-center gap-1">
                                <Star className="h-3.5 w-3.5 text-yellow-500" />
                                {talent.rating.toFixed(1)}
                              </span>
                              <span className="text-foreground/30">•</span>
                              <span>{talent.email ? talent.email : 'No email listed'}</span>
                            </div>
                          </div>
                        </div>

                        <p className="text-sm text-foreground/70 line-clamp-2">
                          {talent.bio?.trim()
                            ? talent.bio
                            : 'Capstone contributor with practical experience building real projects. Available for collaboration and opportunities.'}
                        </p>

                        <div className="flex flex-wrap gap-2">
                          {shownSkills.map((skill) => (
                            <Badge
                              key={skill}
                              variant="secondary"
                              className="text-xs bg-primary/5 text-foreground border border-primary/10"
                            >
                              {skill}
                            </Badge>
                          ))}
                          {extra > 0 && (
                            <Badge variant="secondary" className="text-xs">
                              +{extra} more
                            </Badge>
                          )}
                        </div>

                        <div className="flex gap-2 pt-2">
                          <HireDialog talent={talent} />
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            ) : (
              <Card className="mx-auto max-w-2xl p-10 text-center">
                <h3 className="text-lg font-semibold font-display">No talents found</h3>
                <p className="mt-2 text-sm text-foreground/60">Try a different keyword or choose “All” roles.</p>

                <div className="mt-5 flex justify-center gap-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('')
                      setFilter('All')
                    }}
                  >
                    Clear filters
                  </Button>
                  <Button onClick={load}>
                    <RefreshCcw className="mr-2 h-4 w-4" />
                    Reload
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
