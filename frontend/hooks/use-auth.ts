'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { Session } from 'next-auth'

type UseAuthReturn = {
  session: Session | null
  isLoading: boolean
  isAuthenticated: boolean
  signIn: typeof signIn
  signOut: typeof signOut
}

export function useAuth(): UseAuthReturn {
  const { data: session, status } = useSession()

  return {
    session,
    isLoading: status === 'loading',
    isAuthenticated: status === 'authenticated',
    signIn,
    signOut,
  }
}

