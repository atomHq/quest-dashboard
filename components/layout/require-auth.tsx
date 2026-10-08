'use client'

import { useEffect } from 'react'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Skeleton } from '@/components/ui/skeleton'
import { useSession } from '@/stores/session'

/** Gate for pages that need a signed-in user. Redirects to /login?next=… once we know they aren't. */
export function RequireAuth({ children, fallback }: { children: React.ReactNode; fallback?: React.ReactNode }) {
  const status = useSession((s) => s.status)
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()

  useEffect(() => {
    if (status === 'anon') {
      const qs = search.toString()
      router.replace(`/login?next=${encodeURIComponent(pathname + (qs ? `?${qs}` : ''))}`)
    }
  }, [status, router, pathname, search])

  if (status !== 'authed') return <>{fallback ?? <PageSkeleton />}</>
  return <>{children}</>
}

export function PageSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-56" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-28 rounded-xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-xl" />
    </div>
  )
}
