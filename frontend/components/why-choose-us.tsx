'use client'

import { Shield, Clock, DollarSign } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type Feature = {
  title: string
  description: string
  icon: React.ComponentType<{ className?: string }>
}

function useInViewOnce<T extends HTMLElement>(options?: IntersectionObserverInit) {
  const ref = useRef<T | null>(null)
  const [inView, setInView] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true)
          io.disconnect()
        }
      },
      { threshold: 0.15, ...options }
    )

    io.observe(el)
    return () => io.disconnect()
  }, [options])

  return { ref, inView }
}

export function WhyChooseUs() {
  const features: Feature[] = [
    {
      title: 'Fast Connections',
      description: 'Connect with recruiters and collaborators in hours, not weeks.',
      icon: Clock,
    },
    {
      title: 'Secure Platform',
      description: 'Enterprise-grade security for your data and intellectual work.',
      icon: Shield,
    },
    {
      title: 'Free to Start',
      description: 'No upfront costs to showcase projects or explore talent.',
      icon: DollarSign,
    },
  ]

  const { ref, inView } = useInViewOnce<HTMLDivElement>()

  return (
    <section className="relative overflow-hidden py-20 md:py-24">
      {/* Darker, premium background */}
      <div
        className="absolute inset-0 bg-gradient-to-b from-black via-black/95 to-background"
        aria-hidden="true"
      />
      <div
        className="absolute inset-0 opacity-70"
        aria-hidden="true"
        style={{
          backgroundImage:
            "radial-gradient(900px circle at 20% 10%, rgba(250,204,21,0.12), transparent 55%), radial-gradient(900px circle at 80% 30%, rgba(99,102,241,0.14), transparent 55%), radial-gradient(900px circle at 50% 90%, rgba(236,72,153,0.10), transparent 55%)",
        }}
      />
      <div
        className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.05)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.08]"
        aria-hidden="true"
      />

      <div ref={ref} className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div
          className={[
            'mx-auto max-w-2xl text-center transition-all duration-700',
            inView ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0',
          ].join(' ')}
        >
          <p className="inline-flex w-fit items-center rounded-full border border-yellow-400/25 bg-yellow-400/10 px-3 py-1 text-xs font-medium text-yellow-100 backdrop-blur">
            Why it works
          </p>
          <h2 className="mt-4 text-3xl font-semibold tracking-tight text-slate-100 sm:text-4xl font-display">
            Why choose our <span className="text-yellow-400">marketplace</span>
          </h2>
          <p className="mt-3 text-base text-slate-200/80 sm:text-lg">
            Built to help students turn ideas into opportunities — faster, safer, and without barriers.
          </p>
        </div>

        {/* Cards */}
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {features.map((feature, i) => {
            const Icon = feature.icon
            return (
              <div
                key={feature.title}
                className={[
                  'group relative overflow-hidden rounded-2xl border border-white/10 bg-white/5 p-7 shadow-2xl backdrop-blur',
                  'transition-all duration-700 will-change-transform',
                  inView ? 'translate-y-0 opacity-100' : 'translate-y-4 opacity-0',
                ].join(' ')}
                style={{
                  transitionDelay: `${120 + i * 120}ms`,
                }}
              >
                {/* hover glow */}
                <div
                  className="pointer-events-none absolute -inset-1 rounded-2xl bg-gradient-to-tr from-primary/25 via-yellow-400/12 to-accent/25 opacity-0 blur-2xl transition-opacity duration-300 group-hover:opacity-100"
                  aria-hidden="true"
                />

                <div className="relative">
                  <div className="mb-5 inline-flex h-12 w-12 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-100 transition group-hover:bg-yellow-400/20">
                    <Icon className="h-5 w-5" />
                  </div>

                  <h3 className="text-lg font-semibold text-slate-100 font-display">
                    {feature.title}
                  </h3>

                  <p className="mt-2 text-sm leading-relaxed text-slate-200/75">
                    {feature.description}
                  </p>

                  <div className="mt-5 inline-flex items-center gap-2 text-xs text-slate-200/60">
                    <span className="h-1.5 w-1.5 rounded-full bg-yellow-400/70" />
                    <span>Professional, student-first experience</span>
                  </div>
                </div>

                <span
                  className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-transparent transition group-hover:ring-yellow-400/15"
                  aria-hidden="true"
                />
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
