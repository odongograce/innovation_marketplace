'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { Search, Filter, Eye, CheckCircle, Clock, XCircle, Package, BadgeCheck, Hourglass } from 'lucide-react'

import { fetchProjects, type ProjectRow } from '@/lib/api/admin-projects'

const getStatusIcon = (status: string) => {
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

const getStatusColor = (status: string) => {
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

function LoadingTableShell() {
  return (
    <Card className="overflow-hidden">
      <div className="border-b bg-muted/30 px-6 py-4">
        <div className="h-5 w-40 rounded bg-muted animate-pulse" />
      </div>
      <div className="p-6 space-y-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-10 w-full rounded bg-muted animate-pulse" />
        ))}
      </div>
    </Card>
  )
}

export default function ProjectsManagement() {
  const { data: session } = useSession()
  const isAdmin = (session as any)?.user?.role === 'admin'

  const [rows, setRows] = useState<ProjectRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<'all' | 'approved' | 'pending' | 'rejected'>('all')

  const hasActiveFilters = Boolean(searchTerm.trim() || filterStatus !== 'all')
  const clearFilters = () => {
    setSearchTerm('')
    setFilterStatus('all')
  }

  const load = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const payload = await fetchProjects()
      setRows(payload.rows)
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load projects')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  const filteredRows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return rows.filter((p) => {
      const matchesSearch = !q || p.title.toLowerCase().includes(q) || p.author.toLowerCase().includes(q)
      const matchesFilter = filterStatus === 'all' || p.status === filterStatus
      return matchesSearch && matchesFilter
    })
  }, [rows, searchTerm, filterStatus])

  const stats = useMemo(() => {
    const total = rows.length
    const approved = rows.filter((p) => p.status === 'approved').length
    const pending = rows.filter((p) => p.status === 'pending').length
    const rejected = rows.filter((p) => p.status === 'rejected').length
    return { total, approved, pending, rejected, shown: filteredRows.length }
  }, [rows, filteredRows.length])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Projects Management</h1>
          <p className="mt-2 text-muted-foreground">
            Open a project to review details, then approve or reject.
          </p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={loading}>
            Refresh
          </Button>
          <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters || loading}>
            Clear filters
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-6 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.total}</p>
              <p className="mt-2 text-xs text-muted-foreground">{stats.shown} shown</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Approved</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.approved}</p>
              <p className="mt-2 text-xs text-muted-foreground">status = approved</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <BadgeCheck className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.pending}</p>
              <p className="mt-2 text-xs text-muted-foreground">status = pending</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Hourglass className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6 sm:col-span-1">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Rejected</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.rejected}</p>
              <p className="mt-2 text-xs text-muted-foreground">status = rejected</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <XCircle className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by title or author..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              variant={filterStatus === 'all' ? 'default' : 'outline'}
              size="sm"
              className="gap-2"
              onClick={() => setFilterStatus('all')}
            >
              <Filter className="h-4 w-4" />
              All
            </Button>

            {(['approved', 'pending', 'rejected'] as const).map((s) => (
              <Button
                key={s}
                variant={filterStatus === s ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterStatus(s)}
              >
                {s[0].toUpperCase() + s.slice(1)}
              </Button>
            ))}
          </div>
        </div>
      </Card>

      {loading && <LoadingTableShell />}

      {!loading && error && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={load}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {!loading && !error && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Project</th>
                  {/* <th className="px-6 py-4 text-left font-semibold text-foreground">Team lead</th> */}
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Category</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Submitted</th>
                  <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th>
                </tr>
              </thead>

              <tbody>
                {filteredRows.map((project) => (
                  <tr key={project.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{project.title}</p>
                    </td>
                    {/* <td className="px-6 py-4 text-foreground/70">{project.author}</td> */}
                    <td className="px-6 py-4 text-foreground/70">{project.category}</td>

                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(project.status)}
                        <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusColor(project.status))}>
                          {project.status}
                        </span>
                      </div>
                    </td>

                    <td className="px-6 py-4 text-foreground/70">{project.submitted}</td>

                    <td className="px-6 py-4">
                      <div className="flex justify-center">
                        <Link href={`/admin/projects/${project.id}`}>
                          <Button variant="ghost" size="sm" title="Review project">
                            <Eye className="h-4 w-4" />
                          </Button>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}

                {filteredRows.length === 0 && (
                  <tr>
                    <td className="px-6 py-12 text-center text-muted-foreground" colSpan={6}>
                      No projects match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {!isAdmin && (
            <div className="border-t px-6 py-3 text-xs text-muted-foreground">
              You must be signed in as admin to approve/reject projects.
            </div>
          )}
        </Card>
      )}
    </div>
  )
}
