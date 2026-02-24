const BASE = process.env.NEXT_PUBLIC_BASE_URL || 'http://127.0.0.1:5555'

export type BackendProject = {
  id: number
  title: string
  description: string
  video: string
  technologies: string
  submitted_name: string
  status: 'approved' | 'pending' | 'rejected'
  created_at: string
  team_members: Array<{
    id: number
    first_name: string
    last_name: string
    email: string
    role: string
  }>
  categories: Array<{ id: number; name: string }>
  likes_count?: number
  liked_by_me?: boolean
}

export async function fetchProjects(): Promise<BackendProject[]> {
  const res = await fetch(`${BASE}/projects`, { cache: 'no-store' })
  if (!res.ok) throw new Error(`Failed to fetch projects (${res.status})`)
  return res.json()
}

export type ProjectCardVM = {
  id: number
  title: string
  description: string
  image?: string
  technologies?: string[] | string
  category: string
  author: string
  views?: number
  rating?: number
}

export function toProjectCardVM(p: BackendProject): ProjectCardVM {
  return {
    id: p.id,
    title: p.title,
    description: p.description,
    image: undefined,
    technologies: p.technologies, 
    category: p.categories?.[0]?.name ?? 'Uncategorized',
    author: p.submitted_name || 'Student Team',
    views: 0,
    rating: 0,
  }
}

export async function fetchFeaturedProjects(limit = 4): Promise<ProjectCardVM[]> {
  const projects = await fetchProjects()

  const approved = projects.filter((p) => p.status === 'approved')

  approved.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  )

  return approved.slice(0, limit).map(toProjectCardVM)
}
