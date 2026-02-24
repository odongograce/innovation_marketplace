'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

import {
  ArrowLeft,
  CheckCircle,
  Clock,
  XCircle,
  Github,
  Users,
  Tag,
  Calendar,
  User,
  Code2,
  FileText,
} from 'lucide-react'

type BackendProject = {
  id: number
  title: string
  description: string
  video: string
  technologies: string
  submitted_name: string
  status: 'approved' | 'pending' | 'rejected'
  created_at: string
  github_url?: string | null
  team_members?: Array<{
    id: number
    first_name: string
    last_name: string
    email: string
    role: string
  }>
  categories?: Array<{ id: number; name: string }>
}

const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:5555'

function getStatusIcon(status: string) {
  switch (status) {
    case 'approved':
      return <CheckCircle className="h-4 w-4 text-green-600" />
    case 'pending':
      return <Clock className="h-4 w-4 text-yellow-600" />
    case 'rejected':
      return <XCircle className="h-4 w-4 text-red-600" />
    default:
      return null
  }
}

function getStatusColor(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-green-500/10 text-green-700 dark:text-green-400'
    case 'pending':
      return 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
    case 'rejected':
      return 'bg-red-500/10 text-red-700 dark:text-red-400'
    default:
      return 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
  }
}

function normalizeGitHubUrl(url?: string | null) {
  if (!url) return null
  const trimmed = url.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) return trimmed
  if (/^[\w.-]+\/[\w.-]+$/.test(trimmed)) return `https://github.com/${trimmed}`
  return trimmed
}

async function readError(res: Response) {
  const contentType = res.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      const data = await res.json()
      if (typeof data?.error === 'string') return data.error
      if (typeof data?.message === 'string') return data.message
      return JSON.stringify(data)
    }
  } catch {
    
  }
  try {
    const text = await res.text()
    return text || null
  } catch {
    return null
  }
}

async function fetchProjects(): Promise<BackendProject[]> {
  const res = await fetch(`${BASE}/projects`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch projects (${res.status})`)
  return res.json()
}

function authHeaders(token?: string) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function approveProject(projectId: number, token: string, reason: string) {
  const res = await fetch(`${BASE}/admin/projects/${projectId}/approve`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  })

  if (!res.ok) {
    const details = await readError(res)
    const baseMsg =
      res.status === 401
        ? 'Unauthorized (401). Please sign in again.'
        : res.status === 403
          ? 'Forbidden (403). Admin access required.'
          : `Approve failed (${res.status}).`
    throw new Error(details ? `${baseMsg} ${details}` : baseMsg)
  }

  return res.json().catch(() => ({}))
}

async function rejectProject(projectId: number, token: string, reason: string) {
  const res = await fetch(`${BASE}/admin/projects/${projectId}/reject`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify({ reason }),
  })

  if (!res.ok) {
    const details = await readError(res)
    const baseMsg =
      res.status === 401
        ? 'Unauthorized (401). Please sign in again.'
        : res.status === 403
          ? 'Forbidden (403). Admin access required.'
          : `Reject failed (${res.status}).`
    throw new Error(details ? `${baseMsg} ${details}` : baseMsg)
  }

  return res.json().catch(() => ({}))
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: any
  label: string
  value: React.ReactNode
}) {
  return (
    <div className="rounded-lg border p-4">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 rounded-md bg-primary/10 p-2">
          <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0">
          <p className="text-xs text-muted-foreground">{label}</p>
          <div className="mt-1 text-sm font-medium text-foreground break-words">{value}</div>
        </div>
      </div>
    </div>
  )
}

export default function AdminProjectDetailsPage() {
  const router = useRouter()
  const params = useParams<{ id: string }>()
  const projectId = Number(params?.id)

  const { data: session, status } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const isAdmin = (session as any)?.user?.role === 'admin'

  const [project, setProject] = useState<BackendProject | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [reason, setReason] = useState('')
  const [actionLoading, setActionLoading] = useState<'approve' | 'reject' | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)

        if (!Number.isFinite(projectId)) {
          setProject(null)
          setError('Invalid project id.')
          return
        }

        const all = await fetchProjects()
        const found = all.find((p) => p.id === projectId) ?? null
        setProject(found)

        if (!found) setError('Project not found.')
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load project')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'loading') return
    run()
  }, [projectId, status])

  const githubLink = useMemo(() => normalizeGitHubUrl(project?.github_url), [project?.github_url])

  const canDecide = Boolean(isAdmin && token && project && project.status === 'pending')

  async function handleApprove() {
    if (!project) return
    if (!token) {
      setError('Missing token. Please sign in again.')
      return
    }
    try {
      setError(null)
      setActionLoading('approve')
      await approveProject(project.id, token, reason)
      router.push('/admin/projects')
    } catch (e: any) {
      setError(e?.message ?? 'Approve failed')
    } finally {
      setActionLoading(null)
    }
  }

  async function handleReject() {
    if (!project) return
    if (!token) {
      setError('Missing token. Please sign in again.')
      return
    }
    try {
      setError(null)
      setActionLoading('reject')
      await rejectProject(project.id, token, reason)
      router.push('/admin/projects')
    } catch (e: any) {
      setError(e?.message ?? 'Reject failed')
    } finally {
      setActionLoading(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Top bar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/admin/projects">
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
          </Link>

          <div>
            <h1 className="text-2xl font-bold text-foreground">Project Review</h1>
            <p className="text-sm text-muted-foreground">Review project details and decide.</p>
          </div>
        </div>
      </div>

      {loading && (
        <Card className="p-6">
          <div className="h-5 w-56 rounded bg-muted animate-pulse" />
          <div className="mt-4 h-24 rounded bg-muted animate-pulse" />
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="h-20 rounded bg-muted animate-pulse" />
            <div className="h-20 rounded bg-muted animate-pulse" />
          </div>
        </Card>
      )}

      {!loading && error && (
        <Card className="p-6">
          <p className="text-sm text-destructive">{error}</p>
          <div className="mt-4 flex gap-2">
            <Button variant="outline" onClick={() => router.push('/admin/projects')}>
              Back to projects
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && project && (
        <>
          {/* Header card */}
          <Card className="p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-foreground truncate">{project.title}</h2>
                  <span className={cn('inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium', getStatusColor(project.status))}>
                    {getStatusIcon(project.status)}
                    {project.status}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Submitted by <span className="font-medium text-foreground">{project.submitted_name || '—'}</span>
                </p>
              </div>

              {githubLink ? (
                <a
                  href={githubLink}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary underline underline-offset-4"
                >
                  <Github className="h-4 w-4" />
                  Open GitHub
                </a>
              ) : (
                <span className="text-sm text-muted-foreground">No GitHub link</span>
              )}
            </div>
          </Card>

          {/* Info grid */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {/* <InfoCard icon={User} label="Team leader" value={project.submitted_name || '—'} /> */}
            <InfoCard icon={Calendar} label="Created" value={String(project.created_at).slice(0, 10) || '—'} />
            <InfoCard icon={Code2} label="Technologies" value={project.technologies || '—'} />
            <InfoCard icon={Github} label="GitHub URL" value={githubLink ? <span className="break-all">{githubLink}</span> : '—'} />
          </div>

          {/* Description */}
          <Card className="p-6">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              <h3 className="text-lg font-semibold text-foreground">Description</h3>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground/90">
              {project.description || '—'}
            </p>
          </Card>

          {/* Categories + team */}
          <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Tag className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Categories</h3>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {(project.categories ?? []).length ? (
                  project.categories!.map((c) => (
                    <span key={c.id} className="rounded-full bg-muted px-3 py-1 text-xs">
                      {c.name}
                    </span>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </Card>

            <Card className="p-6">
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <h3 className="text-lg font-semibold text-foreground">Team Members</h3>
              </div>

              <div className="mt-3 space-y-2">
                {(project.team_members ?? []).length ? (
                  project.team_members!.map((m) => (
                    <div key={m.id} className="flex items-center justify-between gap-3 rounded-md border px-3 py-2 text-sm">
                      <span className="font-medium truncate">
                        {m.first_name} {m.last_name}
                      </span>
                      <span className="text-muted-foreground shrink-0">{m.role}</span>
                    </div>
                  ))
                ) : (
                  <span className="text-sm text-muted-foreground">—</span>
                )}
              </div>
            </Card>
          </div>

          {/* Decision */}
          <Card className="p-6">
            <h3 className="text-lg font-semibold text-foreground">Decision</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              Add an optional reason. This will be stored in approval_reason / rejection_reason.
            </p>

            {!isAdmin && (
              <p className="mt-3 text-sm text-destructive">You must be signed in as an admin to approve/reject.</p>
            )}

            {isAdmin && !token && (
              <p className="mt-3 text-sm text-destructive">Missing token. Please sign in again.</p>
            )}

            {project.status !== 'pending' && (
              <p className="mt-3 text-sm text-muted-foreground">
                This project is already <span className="font-medium">{project.status}</span>.
              </p>
            )}

            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Decision reason </p>
              <Textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Write a short reason..."
                className="min-h-[110px]"
                disabled={!canDecide || actionLoading !== null}
              />
            </div>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={handleReject}
                disabled={!canDecide || actionLoading !== null}
              >
                {actionLoading === 'reject' ? 'Rejecting…' : 'Reject'}
              </Button>
              <Button
                onClick={handleApprove}
                disabled={!canDecide || actionLoading !== null}
              >
                {actionLoading === 'approve' ? 'Approving…' : 'Approve'}
              </Button>
            </div>

            {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
          </Card>
        </>
      )}
    </div>
  )
}
