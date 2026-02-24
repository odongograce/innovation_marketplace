const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:5555'

function authHeaders(token?: string) {
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    'Content-Type': 'application/json',
  }
}

export async function toggleProjectLike(args: {
  projectId: number
  like: boolean
  token?: string
}): Promise<{ liked: boolean; likes_count?: number }> {
  const { projectId, like, token } = args

  const res = await fetch(`${BASE}/projects/${projectId}/like`, {
    method: like ? 'POST' : 'DELETE',
    headers: authHeaders(token),
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Failed to toggle like (${res.status}): ${text}`)
  }

  return res.json()
}
