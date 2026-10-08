'use client'

import Link from 'next/link'
import { Loader2, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import type { Participant } from '@/lib/api/types'
import { useParticipants } from '@/hooks/queries'
import { EmptyState, ErrorState, InitialsAvatar } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

const STATUS: Record<Participant['status'], string> = {
  joined: 'text-muted-foreground',
  submitted: 'text-success',
  disqualified: 'text-destructive',
  withdrawn: 'text-muted-foreground line-through',
}

export function ParticipantsTab({ challengeId }: { challengeId: string }) {
  const q = useParticipants(challengeId)
  const items = q.data?.pages.flatMap((p) => p.data) ?? []

  if (q.isPending)
    return (
      <div className="grid gap-2">
        {Array.from({ length: 5 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 rounded-lg border bg-card p-3">
            <Skeleton className="size-9 rounded-full" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="ml-auto h-4 w-16" />
          </div>
        ))}
      </div>
    )
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (items.length === 0)
    return <EmptyState icon={Users} title="No participants yet" description="Be the first to join." />

  return (
    <div className="grid gap-2">
      {items.map((p) => (
        <div key={p.id} className="flex items-center gap-3 rounded-lg border bg-card p-3">
          {/* avatar_key is a storage key, not a URL — initials only. */}
          <InitialsAvatar name={p.username} />
          <div className="min-w-0">
            <Link href={`/u/${p.username}`} className="block truncate text-sm font-medium hover:text-primary">
              @{p.username}
            </Link>
            <p className="text-xs text-muted-foreground">Joined {timeAgo(p.joined_at)}</p>
          </div>
          <span className={cn('ml-auto text-xs capitalize', STATUS[p.status])}>{p.status}</span>
        </div>
      ))}
      {q.hasNextPage && (
        <Button variant="outline" className="mt-2 justify-self-center" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
          {q.isFetchingNextPage && <Loader2 className="animate-spin" />} Load more
        </Button>
      )}
    </div>
  )
}
