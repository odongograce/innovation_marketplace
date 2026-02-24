'use client'

import { useEffect, useMemo, useState } from 'react'
import { useSession } from 'next-auth/react'

import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import { Download, Calendar, TrendingUp, Users, Package, AlertTriangle } from 'lucide-react'

import { fetchProjects, type BackendProject } from '@/lib/api/projects'
import { fetchAdminUsers, type AdminUser } from '@/lib/api/admin-users'
import { cn } from '@/lib/utils'

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function monthLabel(key: string) {
  const [y, m] = key.split('-')
  const date = new Date(Number(y), Number(m) - 1, 1)
  return date.toLocaleString(undefined, { month: 'short' })
}

function safeDate(s: string) {
  const d = new Date(s)
  return Number.isNaN(d.getTime()) ? null : d
}

type MonthlyPoint = { month: string; projects: number; users: number; revenue: number }
type CategoryPoint = { name: string; value: number; color: string }

const COLORS = ['#8b5cf6', '#06b6d4', '#10b981', '#f59e0b', '#ef4444', '#64748b', '#22c55e', '#a855f7']

function LoadingShell() {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="h-8 w-56 rounded bg-muted animate-pulse" />
          <div className="mt-3 h-4 w-[520px] max-w-full rounded bg-muted animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-9 w-32 rounded bg-muted animate-pulse" />
          <div className="h-9 w-36 rounded bg-muted animate-pulse" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="p-6">
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
            <div className="mt-3 h-8 w-16 rounded bg-muted animate-pulse" />
            <div className="mt-3 h-3 w-40 rounded bg-muted animate-pulse" />
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="h-5 w-44 rounded bg-muted animate-pulse" />
        <div className="mt-4 h-[300px] w-full rounded bg-muted animate-pulse" />
      </Card>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <div className="h-5 w-52 rounded bg-muted animate-pulse" />
          <div className="mt-4 h-[250px] w-full rounded bg-muted animate-pulse" />
        </Card>
        <Card className="p-6">
          <div className="h-5 w-52 rounded bg-muted animate-pulse" />
          <div className="mt-4 h-[250px] w-full rounded bg-muted animate-pulse" />
        </Card>
      </div>
    </div>
  )
}

export default function Analytics() {
  const { data: session, status } = useSession()
  const token = (session as any)?.accessToken as string | undefined

  const [projects, setProjects] = useState<BackendProject[]>([])
  const [users, setUsers] = useState<AdminUser[]>([])
  const [usersWarning, setUsersWarning] = useState<string | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true)
        setError(null)
        setUsersWarning(null)

        const p = await fetchProjects()
        setProjects(Array.isArray(p) ? p : [])

        if (token) {
          try {
            const u = await fetchAdminUsers(token)
            setUsers(Array.isArray(u) ? u : [])
          } catch (e: any) {
            setUsers([])
            setUsersWarning(e?.message ?? 'Users data unavailable (admin endpoint failed).')
          }
        } else {
          setUsers([])
          setUsersWarning('Users analytics requires admin sign-in (missing token).')
        }
      } catch (e: any) {
        setError(e?.message ?? 'Failed to load analytics data')
      } finally {
        setLoading(false)
      }
    }

    if (status === 'loading') return
    run()
  }, [status, token])

  const approvedCount = useMemo(() => projects.filter((p) => p.status === 'approved').length, [projects])
  const pendingCount = useMemo(() => projects.filter((p) => p.status === 'pending').length, [projects])
  const rejectedCount = useMemo(() => projects.filter((p) => p.status === 'rejected').length, [projects])

  const monthlyData: MonthlyPoint[] = useMemo(() => {
    const now = new Date()
    const keys: string[] = []
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      keys.push(monthKey(d))
    }

    const projCounts = new Map<string, number>()
    const userCounts = new Map<string, number>()

    for (const p of projects) {
      const d = safeDate(p.created_at)
      if (!d) continue
      const k = monthKey(d)
      projCounts.set(k, (projCounts.get(k) ?? 0) + 1)
    }

    for (const u of users) {
      const d = safeDate(u.created_at)
      if (!d) continue
      const k = monthKey(d)
      userCounts.set(k, (userCounts.get(k) ?? 0) + 1)
    }

    return keys.map((k) => ({
      month: monthLabel(k),
      projects: projCounts.get(k) ?? 0,
      users: userCounts.get(k) ?? 0,
      revenue: 0,
    }))
  }, [projects, users])

  const categoryData: CategoryPoint[] = useMemo(() => {
    const counts = new Map<string, number>()

    for (const p of projects) {
      const cats = p.categories?.length ? p.categories : [{ id: -1, name: 'Other' }]
      for (const c of cats) {
        const name = c?.name ?? 'Other'
        counts.set(name, (counts.get(name) ?? 0) + 1)
      }
    }

    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .map(([name, value], idx) => ({
        name,
        value,
        color: COLORS[idx % COLORS.length],
      }))
  }, [projects])

  const topProjects = useMemo(() => {
    return [...projects]
      .sort((a, b) => (b.team_members?.length ?? 0) - (a.team_members?.length ?? 0))
      .slice(0, 5)
      .map((p) => ({
        title: p.title,
        team: p.team_members?.length ?? 0,
        status: p.status,
        submitted: p.created_at?.slice(0, 10) ?? '—',
      }))
  }, [projects])

  if (loading) return <LoadingShell />

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="mt-2 text-destructive">{error}</p>
        </div>
        <Button variant="outline" onClick={() => location.reload()}>
          Retry
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Analytics & Reports</h1>
          <p className="mt-2 text-muted-foreground">
            Derived from backend data (projects + admin users). Revenue/traffic/conversion require backend support.
          </p>
          {usersWarning && (
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground/70">
              <AlertTriangle className="h-4 w-4" />
              {usersWarning}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-2 bg-transparent">
            <Calendar className="h-4 w-4" />
            Last 8 Months
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="gap-2 bg-transparent"
            onClick={() => alert('Export not implemented yet')}
          >
            <Download className="h-4 w-4" />
            Export Report
          </Button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Projects</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{projects.length}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {approvedCount} approved • {pendingCount} pending • {rejectedCount} rejected
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Package className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Users</p>
              <p className="mt-2 text-3xl font-bold text-foreground">{users.length || '—'}</p>
              <p className="mt-2 text-xs text-muted-foreground">
                {token ? 'From /admin/users' : 'Requires admin sign-in'}
              </p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Users className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Revenue</p>
              <p className="mt-2 text-3xl font-bold text-foreground">—</p>
              <p className="mt-2 text-xs text-muted-foreground">Needs backend totals</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <TrendingUp className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Reports</p>
              <p className="mt-2 text-3xl font-bold text-foreground">Ready</p>
              <p className="mt-2 text-xs text-muted-foreground">Export is UI-only</p>
            </div>
            <div className="rounded-lg bg-primary/10 p-3">
              <Download className="h-6 w-6 text-primary" />
            </div>
          </div>
        </Card>
      </div>

      {/* Growth Overview */}
      <Card className="p-6">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Growth Metrics</h3>
            <p className="text-sm text-muted-foreground">Projects & users created per month.</p>
          </div>
        </div>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={monthlyData}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
            <XAxis dataKey="month" stroke="var(--muted-foreground)" />
            <YAxis stroke="var(--muted-foreground)" />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--card)',
                border: `1px solid var(--border)`,
                borderRadius: '6px',
              }}
            />
            <Legend />
            <Line type="monotone" dataKey="projects" stroke="var(--primary)" name="Projects" />
            <Line type="monotone" dataKey="users" stroke="var(--secondary)" name="Users" />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Revenue + Category */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Monthly Revenue</h3>
          <p className="text-sm text-muted-foreground mb-4">Currently 0 (backend totals not available).</p>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" stroke="var(--muted-foreground)" />
              <YAxis stroke="var(--muted-foreground)" />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: `1px solid var(--border)`,
                  borderRadius: '6px',
                }}
              />
              <Bar dataKey="revenue" fill="var(--accent)" name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-1">Projects by Category</h3>
          <p className="text-sm text-muted-foreground mb-4">Distribution based on assigned categories.</p>

          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={categoryData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={2} dataKey="value">
                {categoryData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--card)',
                  border: `1px solid var(--border)`,
                  borderRadius: '6px',
                }}
              />
            </PieChart>
          </ResponsiveContainer>

          {/* legend chips */}
          <div className="mt-4 flex flex-wrap gap-2">
            {categoryData.slice(0, 8).map((c) => (
              <div key={c.name} className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1 text-xs text-foreground/70">
                <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: c.color }} />
                <span className="font-medium text-foreground">{c.name}</span>
                <span className="text-foreground/60">{c.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Mock sections */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Conversion Funnel</h3>
          <p className="text-sm text-muted-foreground">
            Not available from backend yet. Add analytics endpoints to track impressions → clicks → hires.
          </p>
        </Card>

        <Card className="p-6">
          <h3 className="text-lg font-semibold text-foreground mb-2">Traffic Sources</h3>
          <p className="text-sm text-muted-foreground">
            Not available from backend yet. Add tracking for referral/source and page views.
          </p>
        </Card>
      </div>

      {/* Top projects */}
      <Card className="p-6">
        <div className="mb-4 flex items-end justify-between">
          <div>
            <h3 className="text-lg font-semibold text-foreground">Top Projects</h3>
            <p className="text-sm text-muted-foreground">Proxy ranking by team size (backend has no views/likes yet).</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border">
                <th className="px-4 py-3 text-left font-medium text-foreground/70">Project</th>
                <th className="px-4 py-3 text-center font-medium text-foreground/70">Team</th>
                <th className="px-4 py-3 text-center font-medium text-foreground/70">Status</th>
                <th className="px-4 py-3 text-center font-medium text-foreground/70">Created</th>
              </tr>
            </thead>
            <tbody>
              {topProjects.map((p) => (
                <tr key={p.title} className="border-b border-border/50 hover:bg-muted/30">
                  <td className="px-4 py-3 font-medium text-foreground">{p.title}</td>
                  <td className="px-4 py-3 text-center text-foreground/70">{p.team}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={cn(
                        'inline-block rounded-full px-2.5 py-0.5 text-xs font-medium',
                        p.status === 'approved'
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : p.status === 'pending'
                            ? 'bg-yellow-500/10 text-yellow-700 dark:text-yellow-400'
                            : 'bg-red-500/10 text-red-700 dark:text-red-400'
                      )}
                    >
                      {p.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center text-foreground/70">{p.submitted}</td>
                </tr>
              ))}
              {topProjects.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-muted-foreground" colSpan={4}>
                    No projects found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
