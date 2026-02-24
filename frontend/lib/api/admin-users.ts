const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:5555'

function authHeaders(token?: string) {
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

async function readError(res: Response) {
  // Try JSON first, then fallback to text
  const contentType = res.headers.get('content-type') || ''
  try {
    if (contentType.includes('application/json')) {
      const data = await res.json()
      return typeof data?.message === 'string' ? data.message : JSON.stringify(data)
    }
  } catch {
    // ignore
  }
  try {
    const text = await res.text()
    return text || null
  } catch {
    return null
  }
}

export type AdminUser = {
  id: number
  first_name: string
  last_name: string
  email: string
  role: string
  status: string 
  created_at: string 
}

export async function fetchAdminUsers(token: string): Promise<AdminUser[]> {
  if (!token) throw new Error('Missing admin token. Please sign in again.')

  const res = await fetch(`${BASE}/admin/users`, {
    method: 'GET',
    headers: authHeaders(token),
    cache: 'no-store',
  })

  if (!res.ok) {
    const details = await readError(res)
    const baseMsg =
      res.status === 401
        ? 'Unauthorized (401). Please sign in again.'
        : res.status === 403
          ? 'Forbidden (403). Admin access required.'
          : `Failed to fetch users (${res.status}).`

    throw new Error(details ? `${baseMsg} ${details}` : baseMsg)
  }

  const data = (await res.json()) as unknown
  if (!Array.isArray(data)) return []
  return data as AdminUser[]
}
