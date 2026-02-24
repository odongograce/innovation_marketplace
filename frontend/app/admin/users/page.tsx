'use client'

import { useEffect, useMemo, useState, useCallback } from 'react'
import { useSession } from 'next-auth/react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { Search, Mail, Trash2, Shield, UserCheck, UserX, Users, UserRound } from 'lucide-react'
import { fetchAdminUsers, type AdminUser } from '@/lib/api/admin-users'

type UserRow = {
  id: number
  name: string
  email: string
  type: 'Student' | 'Recruiter' | 'Admin' | 'Other'
  status: 'active' | 'inactive' | string
  projects: number 
  joined: string
}

const getStatusBadge = (status: string) => {
  return status === 'active'
    ? 'bg-green-500/10 text-green-700 dark:text-green-400'
    : 'bg-red-500/10 text-red-700 dark:text-red-400'
}

const getTypeBadge = (type: string) => {
  return type === 'Student'
    ? 'bg-blue-500/10 text-blue-700 dark:text-blue-400'
    : type === 'Recruiter'
      ? 'bg-purple-500/10 text-purple-700 dark:text-purple-400'
      : type === 'Admin'
        ? 'bg-amber-500/10 text-amber-700 dark:text-amber-400'
        : 'bg-gray-500/10 text-gray-700 dark:text-gray-400'
}

function mapUser(u: AdminUser): UserRow {
  const fullName = `${u.first_name ?? ''} ${u.last_name ?? ''}`.trim() || u.email

  const role = (u.role ?? '').toLowerCase()
  const type: UserRow['type'] =
    role === 'student'
      ? 'Student'
      : role === 'recruiter'
        ? 'Recruiter'
        : role === 'admin'
          ? 'Admin'
          : 'Other'

  return {
    id: u.id,
    name: fullName,
    email: u.email,
    type,
    status: u.status ?? 'active',
    projects: 0,
    joined: (u.created_at ?? '').slice(0, 10) || '—',
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

export default function UsersManagement() {
  const { data: session, status } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [rows, setRows] = useState<UserRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<'all' | 'Student' | 'Recruiter' | 'Admin'>('all')

  const hasActiveFilters = Boolean(searchTerm.trim() || filterType !== 'all')

  const clearFilters = () => {
    setSearchTerm('')
    setFilterType('all')
  }

  const load = useCallback(async () => {
    if (!token) return
    try {
      setLoading(true)
      setError(null)
      const users = await fetchAdminUsers(token)
      setRows(Array.isArray(users) ? users.map(mapUser) : [])
    } catch (e: any) {
      setError(e?.message ?? 'Failed to load users')
      setRows([])
    } finally {
      setLoading(false)
    }
  }, [token])

  useEffect(() => {
    if (status === 'loading') return
    if (!token) {
      setLoading(false)
      setError('Not authenticated (missing access token). Please sign in again.')
      return
    }
    load()
  }, [status, token, load])

  const filteredUsers = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    return rows.filter((u) => {
      const matchesSearch =
        !q ||
        u.name.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q)

      const matchesFilter = filterType === 'all' || u.type === filterType
      return matchesSearch && matchesFilter
    })
  }, [rows, searchTerm, filterType])

  const stats = useMemo(() => {
    const totalUsers = rows.length
    const activeUsers = rows.filter((u) => u.status === 'active').length
    const students = rows.filter((u) => u.type === 'Student').length
    return { totalUsers, activeUsers, students, shown: filteredUsers.length }
  }, [rows, filteredUsers.length])

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Users & Talents</h1>
          <p className="mt-2 text-muted-foreground">Manage student profiles and recruiter accounts</p>
        </div>

        <div className="flex gap-2">
          <Button variant="outline" onClick={load} disabled={!token || loading}>
            Refresh
          </Button>
          <Button variant="outline" onClick={clearFilters} disabled={!hasActiveFilters || loading}>
            Clear filters
          </Button>
        </div>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.totalUsers}</p>
              <p className="mt-2 text-xs text-muted-foreground">{stats.shown} shown</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Active Users</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.activeUsers}</p>
              <p className="mt-2 text-xs text-muted-foreground">status = active</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <UserRound className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Students</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{stats.students}</p>
              <p className="mt-2 text-xs text-muted-foreground">role = student</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Shield className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['all', 'Student', 'Recruiter', 'Admin'] as const).map((t) => (
              <Button
                key={t}
                variant={filterType === t ? 'default' : 'outline'}
                size="sm"
                onClick={() => setFilterType(t)}
              >
                {t === 'all' ? 'All Users' : t}
              </Button>
            ))}
          </div>
        </div>

        {/* Active filter chips */}
        <div className="mt-4 flex flex-wrap items-center gap-2 text-sm text-foreground/60">
          {searchTerm.trim() ? (
            <span className="rounded-full bg-muted px-3 py-1 text-xs">
              Query: <span className="font-medium text-foreground">{searchTerm.trim()}</span>
            </span>
          ) : null}

          {filterType !== 'all' ? (
            <span className="rounded-full bg-muted px-3 py-1 text-xs">
              Type: <span className="font-medium text-foreground">{filterType}</span>
            </span>
          ) : null}

          {!hasActiveFilters ? <span>No active filters</span> : null}
        </div>
      </Card>

      {/* Loading / Error */}
      {loading && <LoadingTableShell />}

      {!loading && error && (
        <Card className="p-6">
          <div className="flex items-center justify-between gap-4">
            <p className="text-sm text-destructive">{error}</p>
            <Button variant="outline" onClick={load} disabled={!token}>
              Retry
            </Button>
          </div>
        </Card>
      )}

      {/* Table */}
      {!loading && !error && (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/50">
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Name</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Email</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Type</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Status</th>
                  <th className="px-6 py-4 text-center font-semibold text-foreground">Projects</th>
                  <th className="px-6 py-4 text-left font-semibold text-foreground">Joined</th>
                  {/* <th className="px-6 py-4 text-center font-semibold text-foreground">Actions</th> */}
                </tr>
              </thead>

              <tbody>
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="border-b border-border/50 hover:bg-muted/30">
                    <td className="px-6 py-4">
                      <p className="font-medium text-foreground">{user.name}</p>
                    </td>

                    <td className="px-6 py-4 text-foreground/70">
                      <div className="flex items-center gap-2">
                        <Mail className="h-4 w-4 text-muted-foreground" />
                        {user.email}
                      </div>
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', getTypeBadge(user.type))}>
                        {user.type}
                      </span>
                    </td>

                    <td className="px-6 py-4">
                      <span className={cn('inline-block px-2.5 py-0.5 rounded-full text-xs font-medium', getStatusBadge(user.status))}>
                        {user.status}
                      </span>
                    </td>

                    <td className="px-6 py-4 text-center font-medium text-foreground">{user.projects}</td>
                    <td className="px-6 py-4 text-foreground/70">{user.joined}</td>

                    <td className="px-6 py-4">
                      {/* <div className="flex justify-center gap-2">
                        <Button variant="ghost" size="sm" title="View Profile (UI only)">
                          <Shield className="h-4 w-4" />
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Activate/Deactivate (not implemented yet)"
                          onClick={() => alert('Backend endpoint not implemented yet')}
                        >
                          {user.status === 'active' ? (
                            <UserX className="h-4 w-4" />
                          ) : (
                            <UserCheck className="h-4 w-4" />
                          )}
                        </Button>

                        <Button
                          variant="ghost"
                          size="sm"
                          title="Delete (not implemented yet)"
                          className="text-destructive hover:text-destructive"
                          onClick={() => alert('Backend endpoint not implemented yet')}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div> */}
                    </td>
                  </tr>
                ))}

                {filteredUsers.length === 0 && (
                  <tr>
                    <td className="px-6 py-12 text-center text-muted-foreground" colSpan={7}>
                      No users match your filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  )
}
