const BASE = process.env.NEXT_PUBLIC_BASE_URL || ''

export function resolveProjectImage(src?: string | null) {
  const s = (src || '').trim()
  if (!s) return null
  if (s.startsWith('http://') || s.startsWith('https://')) return s
  const base = BASE.endsWith('/') ? BASE.slice(0, -1) : BASE
  return `${base}${s}`
}
