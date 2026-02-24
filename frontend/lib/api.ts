const BASE = process.env.NEXT_PUBLIC_BASE_URL || ''

function authHeaders(token?: string): HeadersInit {
  if (!token) return {}
  const cleaned = token.startsWith('Bearer ') ? token.slice(7) : token
  return { Authorization: `Bearer ${cleaned}` }
}

async function safeJson(res: Response) {
  try {
    return await res.json()
  } catch {
    return {}
  }
}

function normalizeProject(p: any) {
  if (!p || typeof p !== 'object') return p
  return {
    ...p,

    image: p.image ?? p.thumbnail_url ?? null,
  }
}

export async function fetchMerchandise() {
  const res = await fetch(`${BASE}/merchandise`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch merchandise')
  return res.json()
}

export async function createMerchandise(
  payload: {
    name: string
    description: string
    price: number
    stock: number
    image_url: string
  },
  token?: string
) {
  const res = await fetch(`${BASE}/merchandise`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  })

  const data = await safeJson(res)
  if (!res.ok) throw new Error((data as any).error || (data as any).message || 'Failed to create merchandise')
  return data
}

export async function updateMerchandise(
  id: number,
  payload: Partial<{
    name: string
    description: string
    price: string | number
    stock: number
    image_url: string
  }>,
  token?: string
) {
  const res = await fetch(`${BASE}/merchandise/${id}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  })

  const data = await safeJson(res)
  if (!res.ok) throw new Error((data as any).error || (data as any).message || 'Failed to update merchandise')
  return data
}

export async function deleteMerchandise(id: number, token?: string) {
  const res = await fetch(`${BASE}/merchandise/${id}`, {
    method: 'DELETE',
    headers: {
      ...authHeaders(token),
    },
  })

  const data = await safeJson(res)
  if (!res.ok) throw new Error((data as any).error || (data as any).message || 'Failed to delete merchandise')
  return data
}

export async function fetchProjects(token?: string) {
  const res = await fetch(`${BASE}/projects`, {
    headers: {
      ...authHeaders(token),
    },
    cache: 'no-store',
  })

  if (!res.ok) throw new Error('Failed to fetch projects')

  const data = await res.json()
  if (!Array.isArray(data)) return []

  return data.map(normalizeProject)
}

export async function fetchMyProjectsFromAllProjects(userId: number, token?: string) {
  const projects = await fetchProjects(token)
  if (!Array.isArray(projects)) return []

  return projects.filter((p: any) => {
    const team = Array.isArray(p.team_members) ? p.team_members : []
    return team.some((m: any) => Number(m.id) === Number(userId))
  })
}

export async function createOrder(items: Array<{ merchandise_id: number; quantity: number }>, token?: string) {
  const res = await fetch(`${BASE}/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify({ items }),
  })

  const data = await safeJson(res)
  if (!res.ok) throw new Error((data as any).error || (data as any).message || 'Failed to create order')
  return data
}

export type CreateProjectPayload = {
  title: string
  description: string
  video: string
  github_url: string
  technologies: string
  submitted_name: string
  team_members?: number[]
  category_ids?: number[]
  category?: string
}

export async function createProject(payload: CreateProjectPayload | FormData, token?: string) {
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData

  const headers: HeadersInit = {
    ...authHeaders(token),
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
  }

  const res = await fetch(`${BASE}/projects`, {
    method: 'POST',
    headers,
    body: isFormData ? payload : JSON.stringify(payload),
  })

  const data = await safeJson(res)
  if (!res.ok) throw new Error((data as any).error || (data as any).message || 'Failed to create project')
  return data
}

export async function signup(payload: {
  first_name: string
  last_name: string
  email: string
  password: string
  role?: string
}) {
  const res = await fetch(`${BASE}/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  const data = await safeJson(res)
  if (!res.ok) throw new Error((data as any).error || 'Signup failed')
  return data
}

export async function fetchApprovedProjects() {
  const res = await fetch(`${BASE}/recruiters/projects`, { cache: 'no-store' })
  if (!res.ok) throw new Error('Failed to fetch approved projects')

  const data = await res.json()
  if (!Array.isArray(data)) return []

  return data.map(normalizeProject)
}

export type UpdateProfilePayload = {
  first_name?: string
  last_name?: string
  password?: string
}

export async function updateProfile(payload: UpdateProfilePayload, token?: string) {
  const res = await fetch(`${BASE}/profile`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...authHeaders(token),
    },
    body: JSON.stringify(payload),
  })

  const data = await safeJson(res)
  if (!res.ok) throw new Error((data as any).error || (data as any).message || 'Failed to update profile')

  return data as {
    message: string
    user: { id: number; first_name: string; last_name: string; email: string }
  }
}

export async function fetchUsers(token: string) {
  const res = await fetch(`${BASE}/users`, {
    headers: {
      ...authHeaders(token),
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error('Failed to fetch users')
  return res.json()
}
