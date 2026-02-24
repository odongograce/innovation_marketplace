'use client'

import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Menu, ShoppingCart, X } from 'lucide-react'
import { useCart } from '@/components/cart/cart-context'
import { useSession } from 'next-auth/react'
import { useEffect, useMemo, useState } from 'react'
import AuthButton from '@/components/auth/auth-button'
import { usePathname, useRouter } from 'next/navigation'

export function Navbar() {
  const { totalItems } = useCart()
  const { data: session } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  const [hydrated, setHydrated] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => setHydrated(true), [])

  const nav = useMemo(
    () => [
      { label: 'Projects', href: '/projects' },
      { label: 'Talents', href: '/talents' },
      { label: 'Shop', href: '/shop' },
    ],
    []
  )

  const isActive = (href: string) => {
    if (!pathname) return false
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(href + '/')
  }

  const goToSignIn = (callbackUrl: string) => {
    router.push(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  const handleCartClick = () => {
    const target = '/cart'
    if (!session) {
      goToSignIn(target)
      return
    }
    router.push(target)
  }

  const handleMobileNav = (href: string) => {
    setMobileOpen(false)
    router.push(href)
  }

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Brand + desktop nav */}
          <div className="flex items-center gap-10">
            <Link href="/" className="group inline-flex items-center gap-2">
              <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-yellow-400/20 bg-yellow-400/10 text-yellow-600 dark:text-yellow-200">
                M
              </span>
              <span className="text-base font-semibold tracking-tight font-display text-foreground">
                Moringa <span className="text-yellow-500">Innovation</span>
              </span>
            </Link>

            <div className="hidden md:flex items-center gap-2">
              {nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={[
                    'rounded-full px-4 py-2 text-sm font-medium transition',
                    isActive(item.href)
                      ? 'bg-yellow-400/10 text-yellow-700 dark:text-yellow-200'
                      : 'text-foreground/70 hover:text-foreground hover:bg-foreground/5',
                  ].join(' ')}
                >
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* Desktop actions */}
          <div className="hidden md:flex items-center gap-3">
            <AuthButton />

            {/* No nested button: Button is the button */}
            <div className="relative">
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="border-border/60"
                onClick={handleCartClick}
                aria-label="Open cart"
              >
                <ShoppingCart className="h-4 w-4" />
              </Button>

              {hydrated && totalItems > 0 && (
                <span className="absolute -top-1 -right-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[11px] font-semibold text-black">
                  {totalItems}
                </span>
              )}
            </div>
          </div>

          {/* Mobile toggle */}
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="md:hidden"
            onClick={() => setMobileOpen((v) => !v)}
            aria-label={mobileOpen ? 'Close menu' : 'Open menu'}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden pb-4">
            <div className="mt-2 space-y-2 rounded-2xl border border-border/60 bg-background/80 p-3 backdrop-blur">
              {nav.map((item) => (
                <button
                  key={item.href}
                  type="button"
                  onClick={() => handleMobileNav(item.href)}
                  className={[
                    'flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm font-medium transition',
                    isActive(item.href)
                      ? 'bg-yellow-400/10 text-yellow-700 dark:text-yellow-200'
                      : 'text-foreground/80 hover:bg-foreground/5',
                  ].join(' ')}
                >
                  <span>{item.label}</span>
                  <span className="text-xs text-foreground/50">→</span>
                </button>
              ))}

              <div className="pt-2 border-t border-border/60 flex items-center justify-between">
                <div className="py-2">
                  <AuthButton />
                </div>

                {/* No nested button here either */}
                <div className="relative">
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    className="border-border/60"
                    onClick={() => {
                      setMobileOpen(false)
                      handleCartClick()
                    }}
                    aria-label="Open cart"
                  >
                    <ShoppingCart className="h-4 w-4" />
                  </Button>

                  {hydrated && totalItems > 0 && (
                    <span className="absolute -top-1 -right-1 rounded-full bg-yellow-400 px-2 py-0.5 text-[11px] font-semibold text-black">
                      {totalItems}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
