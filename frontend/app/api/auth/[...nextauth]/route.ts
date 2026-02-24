import NextAuth from "next-auth"
import type { NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"

type AppUser = {
  id: string
  email: string
  username: string
  role: string
  accessToken: string
  first_name?: string
  last_name?: string
  name?: string
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,

  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "text", placeholder: "jsmith" },
        password: { label: "Password", type: "password" },
      },

      async authorize(credentials) {
        const email = (credentials?.email ?? "").trim().toLowerCase()
        const password = credentials?.password ?? ""

        if (!email || !password) return null

        const res = await fetch(`${process.env.NEXT_PUBLIC_BASE_URL}/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        })

        if (!res.ok) return null

        const data = await res.json().catch(() => null)
        if (!data?.access_token || !data?.user_id || !data?.role) return null

        const displayName =
          [data.first_name, data.last_name].filter(Boolean).join(' ') ||
          (email ? email.split('@')[0] : 'Admin')

        const user: AppUser = {
          id: String(data.user_id),
          email: String(data.email ?? email),
          username: displayName,
          role: String(data.role),
          accessToken: String(data.access_token),
        }


        return user
      },
    }),
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as AppUser
        token.id = u.id
        token.email = u.email
        token.username = u.username
        token.role = u.role
        token.accessToken = u.accessToken
      }
      return token
    },

    async session({ session, token }) {
      session.user = {
        ...(session.user ?? {}),
        id: typeof token.id === "string" ? token.id : "",
        email: typeof token.email === "string" ? token.email : "",
        username: typeof token.username === "string" ? token.username : "",
        role: typeof token.role === "string" ? token.role : "",
      }

        ; (session as unknown as { accessToken?: string }).accessToken =
          typeof token.accessToken === "string" ? token.accessToken : undefined

      return session
    },
  },
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
