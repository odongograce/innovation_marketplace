'use client'

import { Button } from '@/components/ui/button'
import { LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'

interface SignOutButtonProps {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link'
  size?: 'default' | 'sm' | 'lg' | 'icon'
  className?: string
  showText?: boolean
}

export function SignOutButton({
  variant = 'ghost',
  size = 'default',
  className = '',
  showText = true
}: SignOutButtonProps) {
  return (
    <Button
      variant={variant}
      size={size}
      className={className}
      onClick={() => signOut({ callbackUrl: '/' })}
    >
      <LogOut className="h-4 w-4" />
      {showText && <span className="ml-2">Sign Out</span>}
    </Button>
  )
}

