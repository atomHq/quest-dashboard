'use client'

import { useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { refreshSession, setAuthFailureHandler } from '@/lib/api/client'
import { ApiError } from '@/lib/api/errors'
import { qk } from '@/hooks/queries'
import { useSession } from '@/stores/session'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        refetchOnWindowFocus: false,
        // Don't hammer the API on client errors (404, 403, validation …).
        retry: (count, err) => !(err instanceof ApiError && err.status >= 400 && err.status < 500) && count < 2,
      },
      mutations: { retry: false },
    },
  })
}

/** Restores the session from the refresh cookie and keeps the access token fresh. */
function SessionManager() {
  const router = useRouter()
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const status = useSession((s) => s.status)
  const user = useSession((s) => s.user)
  const expiresAt = useSession((s) => s.accessExpiresAt)

  // Initial restore.
  useEffect(() => {
    refreshSession().then((ok) => {
      if (!ok) useSession.getState().clear()
    })
  }, [])

  // On unrecoverable 401: drop cached private data and go to /login.
  useEffect(() => {
    setAuthFailureHandler(() => {
      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== 'challenges' && q.queryKey[0] !== 'trending' })
      const next = window.location.pathname + window.location.search
      router.replace(`/login?next=${encodeURIComponent(next)}`)
    })
    return () => setAuthFailureHandler(null)
  }, [router, queryClient, pathname])

  // Keep ['me'] in sync with the store (seeded from login/signup/refresh responses).
  useEffect(() => {
    if (user) queryClient.setQueryData(qk.me, user)
  }, [user, queryClient])

  // Proactive refresh ~60s before expiry.
  useEffect(() => {
    if (status !== 'authed' || !expiresAt) return
    const ms = new Date(expiresAt).getTime() - Date.now() - 60_000
    const t = setTimeout(() => void refreshSession(), Math.max(ms, 5_000))
    return () => clearTimeout(t)
  }, [status, expiresAt])

  return null
}

export function Providers({ children }: { children: React.ReactNode }) {
  const [client] = useState(makeQueryClient)
  return (
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <SessionManager />
        {children}
        <Toaster theme="dark" position="bottom-right" richColors />
      </TooltipProvider>
      <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-left" />
    </QueryClientProvider>
  )
}
