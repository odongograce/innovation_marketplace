import { withAuth } from "next-auth/middleware"
import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

export function middleware(req: NextRequest) {
  return NextResponse.next()
}

export default withAuth(
  middleware,
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const path = req.nextUrl.pathname
        
        const publicPaths = ['/auth/signin', '/auth/register', '/api/auth']
        
        if (publicPaths.some(p => req.nextUrl.pathname.startsWith(p))) {
          return true
        }
        
        return !!token
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|public).*)',
  ],
}

