'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'

import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'

import Link from 'next/link'
import { ArrowLeft, Info, Loader2, PlusCircle } from 'lucide-react'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/components/ui/use-toast'

import ContributorsSelect, { type UserOption } from '@/components/ui/contributors-select'

import { createProject, fetchUsers, type CreateProjectPayload } from '@/lib/api'

const CATEGORY_OPTIONS = ['HealthTech', 'EdTech', 'FinTech', 'AgriTech', 'Other'] as const

function parseTechnologies(raw: string): string[] {
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
}

const MAX_THUMBNAIL_SIZE = 3 * 1024 * 1024 
const ALLOWED_THUMB_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const

const schema = z.object({
  title: z.string().trim().min(3, 'Title must be at least 3 characters').max(50, 'Max 50 characters'),
  description: z
    .string()
    .trim()
    .min(20, 'Description must be at least 20 characters')
    .max(500, 'Max 500 characters'),
  video: z
    .string()
    .trim()
    .min(8, 'Video is required')
    .refine((v) => /^https?:\/\/.+/i.test(v), 'Video must be a valid URL (https://...)'),
  github_url: z
    .string()
    .trim()
    .min(8, 'GitHub URL is required')
    .refine((v) => /^https?:\/\/.+/i.test(v), 'GitHub URL must be a valid URL (https://...)'),
  technologies: z.string().trim().min(2, 'Technologies is required (e.g. React, Flask)'),
  category: z.enum(CATEGORY_OPTIONS),
  contributors: z.array(z.number()).optional(),
  thumbnail: z
    .instanceof(File)
    .optional()
    .refine((f) => !f || ALLOWED_THUMB_TYPES.includes(f.type as any), 'Thumbnail must be JPG, PNG, or WEBP')
    .refine((f) => !f || f.size <= MAX_THUMBNAIL_SIZE, 'Thumbnail must be 3MB or less'),
})

type FormValues = z.infer<typeof schema>

function FieldError({ message }: { message?: string }) {
  if (!message) return null
  return <p className="text-sm text-destructive">{message}</p>
}

export default function SubmitProjectPage() {
  const router = useRouter()
  const { toast } = useToast()
  const { data: session, status } = useSession()

  const token = session?.accessToken
  const DASHBOARD_PATH = '/student-dashboard'

  const [userOptions, setUserOptions] = useState<UserOption[]>([])
  const [usersLoading, setUsersLoading] = useState(false)

  const [thumbPreview, setThumbPreview] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (thumbPreview) URL.revokeObjectURL(thumbPreview)
    }
  }, [thumbPreview])

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'student') router.replace('/auth/signin')
  }, [session, status, router])

  useEffect(() => {
    if (!token) return

    let cancelled = false
    ;(async () => {
      try {
        setUsersLoading(true)
        const users = await fetchUsers(String(token))
        if (cancelled) return

        const opts: UserOption[] = (Array.isArray(users) ? users : [])
          .map((u: any) => ({
            id: Number(u.id),
            label: `${u.first_name ?? ''} ${u.last_name ?? ''} (${u.email ?? ''})`.trim(),
          }))
          .filter((o) => Number.isFinite(o.id) && o.label.length > 0)

        setUserOptions(opts)
      } catch (e) {
      } finally {
        if (!cancelled) setUsersLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [token])

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    watch,
    reset,
    setValue,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: '',
      description: '',
      video: '',
      github_url: '',
      technologies: '',
      category: 'Other',
      contributors: [],
      thumbnail: undefined, 
    },
    mode: 'onTouched',
  })

  const technologiesValue = watch('technologies') || ''
  const techPreview = useMemo(() => parseTechnologies(technologiesValue), [technologiesValue])

  const contributorIds = watch('contributors') || []

  const onSubmit = async (values: FormValues) => {
    if (!token) {
      toast({
        title: 'Session expired',
        description: 'Please sign in again.',
        variant: 'destructive',
      })
      router.replace('/auth/signin')
      return
    }

    const submitted_name = (session?.user as any)?.username || (session?.user as any)?.email || 'Student'

    const fd = new FormData()
    fd.append('title', values.title.trim())
    fd.append('description', values.description.trim())
    fd.append('video', values.video.trim())
    fd.append('github_url', values.github_url.trim())
    fd.append('technologies', values.technologies.trim())
    fd.append('submitted_name', submitted_name)
    fd.append('category', values.category)

    ;(values.contributors || []).forEach((id) => fd.append('team_members', String(id)))

    if (values.thumbnail) {
      fd.append('thumbnail', values.thumbnail)
    }

    try {
      await createProject(fd as any, String(token))

      toast({
        title: 'Project submitted',
        description: 'Your project was created successfully.',
      })

      reset()
      setThumbPreview((prev) => {
        if (prev) URL.revokeObjectURL(prev)
        return null
      })

      router.replace(DASHBOARD_PATH)
      router.refresh()
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Something went wrong.'
      toast({
        title: 'Submission failed',
        description: message,
        variant: 'destructive',
      })
    }
  }

  if (status === 'loading') {
    return (
      <div className="min-h-screen">
        <Navbar />
        <main className="container mx-auto max-w-3xl px-4 py-10">
          <div className="h-8 w-64 rounded bg-muted animate-pulse" />
          <div className="mt-6 h-96 rounded bg-muted animate-pulse" />
        </main>
        <Footer />
      </div>
    )
  }

  if (!session || session.user.role !== 'student') return null

  return (
    <div className="min-h-screen">
      <Navbar />

      <main className="container mx-auto max-w-3xl px-4 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight">Submit Project</h1>
            <p className="text-foreground/70">Add your project details for review. Make sure your demo link is accessible.</p>
          </div>

          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="whitespace-nowrap">
              {isSubmitting ? 'Submitting…' : 'Ready'}
            </Badge>

            <Link href={DASHBOARD_PATH}>
              <Button variant="outline" className="gap-2">
                <ArrowLeft className="h-4 w-4" />
                Back
              </Button>
            </Link>
          </div>
        </div>

        {/* Info callout */}
        <Card className="mt-6 p-4">
          <div className="flex gap-3">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted">
              <Info className="h-4 w-4 text-foreground/70" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-medium">Tips for a strong submission</p>
              <p className="text-sm text-foreground/70">
                Keep the title clear, describe the problem and solution, and list your key technologies. Use valid{' '}
                <span className="font-medium">https://</span> URLs for demo + GitHub.
              </p>
            </div>
          </div>
        </Card>

        {/* Form */}
        <Card className="mt-6 p-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Title */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Title</label>
              <Input placeholder="e.g. Innovation Marketplace" {...register('title')} />
              <FieldError message={errors.title?.message} />
            </div>

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <textarea
                className="w-full min-h-[140px] rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                placeholder="What does your project do? Who is it for? What problem does it solve?"
                {...register('description')}
              />
              <div className="flex items-center justify-between gap-3">
                <FieldError message={errors.description?.message} />
                <span className="text-xs text-foreground/60">{(watch('description') || '').length}/500</span>
              </div>
            </div>

            {/* Video */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Demo</label>
              <Input placeholder="https://youtube.com/..." {...register('video')} />
              <FieldError message={errors.video?.message} />
            </div>

            {/* GitHub */}
            <div className="space-y-2">
              <label className="text-sm font-medium">GitHub Repo URL</label>
              <Input placeholder="https://github.com/username/repo" {...register('github_url')} />
              <FieldError message={errors.github_url?.message} />
            </div>

            {/* Thumbnail / Screenshot */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Thumbnail / Screenshot (optional)</label>

              <div className="grid gap-3 sm:grid-cols-[160px_1fr] sm:items-start">
                <div className="h-28 w-full overflow-hidden rounded-lg border bg-muted">
                  {thumbPreview ? (
                    <img src={thumbPreview} alt="Thumbnail preview" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full items-center justify-center text-xs text-foreground/60">
                      No image selected
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={isSubmitting}
                    onChange={(e) => {
                      const file = e.target.files?.[0]

                      if (!file) {
                        setValue('thumbnail', undefined, { shouldTouch: true, shouldValidate: true })
                        setThumbPreview((prev) => {
                          if (prev) URL.revokeObjectURL(prev)
                          return null
                        })
                        return
                      }

                      setValue('thumbnail', file, { shouldTouch: true, shouldValidate: true })
                      setThumbPreview((prev) => {
                        if (prev) URL.revokeObjectURL(prev)
                        return URL.createObjectURL(file)
                      })
                    }}
                  />

                  <FieldError message={errors.thumbnail?.message as any} />

                  <p className="text-xs text-foreground/60">JPG/PNG/WEBP • max 3MB</p>

                  {thumbPreview ? (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={isSubmitting}
                      onClick={() => {
                        setValue('thumbnail', undefined, { shouldTouch: true, shouldValidate: true })
                        setThumbPreview((prev) => {
                          if (prev) URL.revokeObjectURL(prev)
                          return null
                        })
                      }}
                    >
                      Remove image
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>

            {/* Category */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" {...register('category')}>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <FieldError message={errors.category?.message} />
            </div>

            {/* Technologies */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Technologies (comma-separated)</label>
              <Input placeholder="React, Next.js, Flask" {...register('technologies')} />
              <FieldError message={errors.technologies?.message} />

              {techPreview.length > 0 ? (
                <div className="flex flex-wrap gap-2 pt-1">
                  {techPreview.slice(0, 8).map((t) => (
                    <Badge key={t} variant="secondary">
                      {t}
                    </Badge>
                  ))}
                  {techPreview.length > 8 ? <Badge variant="secondary">+{techPreview.length - 8} more</Badge> : null}
                </div>
              ) : (
                <p className="text-xs text-foreground/60">Example: React, Next.js, Flask</p>
              )}
            </div>

            {/* Contributors */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Contributors</label>

              <ContributorsSelect
                options={userOptions}
                selectedIds={contributorIds}
                onChangeSelectedIds={(ids) => setValue('contributors', ids, { shouldTouch: true, shouldValidate: true })}
                disabled={isSubmitting}
                placeholder={usersLoading ? 'Loading users…' : 'Search by name/email...'}
              />

              <p className="text-xs text-foreground/60">
                Choose from the dropdown to add contributors. They will be linked as contributors on the project.
              </p>
            </div>

            {/* Actions */}
            <div className="flex flex-wrap items-center gap-3 border-t pt-5">
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                {isSubmitting ? 'Submitting…' : 'Submit Project'}
              </Button>

              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => router.replace(DASHBOARD_PATH)}
              >
                Cancel
              </Button>
            </div>
          </form>
        </Card>
      </main>

      <Footer />
    </div>
  )
}
