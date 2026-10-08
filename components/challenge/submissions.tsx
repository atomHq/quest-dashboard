'use client'

import { useState } from 'react'
import { Eye, Heart, Inbox, Loader2, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { timeAgo } from '@/lib/time'
import type { SubmissionMedia, SubmissionType, SubmissionWithMedia } from '@/lib/api/types'
import { useSubmission, useSubmissions } from '@/hooks/queries'
import { EmptyState, ErrorState, SubmissionTypeIcon } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog'
import { Skeleton } from '@/components/ui/skeleton'

function MediaThumb({ media, fallback }: { media?: SubmissionMedia; fallback: SubmissionType }) {
  const type = media?.media_type ?? fallback
  if (media?.cdn_url && media.media_type === 'image') {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.cdn_url} alt="" className="size-full object-cover" loading="lazy" />
  }
  if (media?.cdn_url && media.media_type === 'video') {
    return <video src={media.cdn_url} className="size-full object-cover" muted preload="metadata" />
  }
  return (
    <div className="grid size-full place-items-center bg-gradient-to-br from-muted to-background text-muted-foreground">
      <SubmissionTypeIcon type={type} className="size-8" />
    </div>
  )
}

function Stats({ s, className }: { s: SubmissionWithMedia['submission']; className?: string }) {
  return (
    <span className={cn('flex items-center gap-3 text-xs text-muted-foreground', className)}>
      <span className="flex items-center gap-1">
        <Heart className="size-3.5" /> <span className="money">{s.like_count}</span>
      </span>
      <span className="flex items-center gap-1">
        <Eye className="size-3.5" /> <span className="money">{s.view_count}</span>
      </span>
    </span>
  )
}

export function SubmissionCard({
  item,
  type,
  onOpen,
  selected,
}: {
  item: SubmissionWithMedia
  type: SubmissionType
  onOpen: () => void
  selected?: boolean
}) {
  const { submission: s, media } = item
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        'group flex flex-col overflow-hidden rounded-xl border bg-card text-left transition-all hover:border-primary/40',
        selected && 'border-primary ring-1 ring-primary',
      )}
    >
      {type === 'written' ? (
        <p className="line-clamp-6 h-40 p-4 text-sm whitespace-pre-line text-muted-foreground">{s.caption}</p>
      ) : (
        <div className="relative aspect-video overflow-hidden bg-muted">
          <MediaThumb media={media[0]} fallback={type} />
          {s.status === 'winner' && (
            <span className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-primary px-2 py-0.5 text-xs font-medium text-primary-foreground">
              <Trophy className="size-3" /> {s.rank ? `#${s.rank}` : 'Winner'}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-1 flex-col gap-2 border-t p-3">
        {type !== 'written' && <p className="line-clamp-2 text-sm">{s.caption || <span className="text-muted-foreground">No caption</span>}</p>}
        <div className="mt-auto flex items-center justify-between">
          <Stats s={s} />
          <span className="text-xs text-muted-foreground">{timeAgo(s.created_at)}</span>
        </div>
      </div>
    </button>
  )
}

function MediaPlayer({ media }: { media: SubmissionMedia }) {
  if (!media.cdn_url) {
    return (
      <div className="grid aspect-video place-items-center rounded-lg bg-muted text-sm text-muted-foreground">
        <span className="flex items-center gap-2">
          <Loader2 className="size-4 animate-spin" /> Media is still processing
        </span>
      </div>
    )
  }
  if (media.media_type === 'image')
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={media.cdn_url} alt="" className="max-h-[60vh] w-full rounded-lg object-contain" />
  if (media.media_type === 'video')
    return <video src={media.cdn_url} controls className="max-h-[60vh] w-full rounded-lg bg-black" />
  return <audio src={media.cdn_url} controls className="w-full" />
}

export function SubmissionModal({ id, onClose }: { id: string | null; onClose: () => void }) {
  const { data, isPending, isError, error, refetch } = useSubmission(id)
  return (
    <Dialog open={!!id} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-2xl">
        <DialogTitle className="sr-only">Submission</DialogTitle>
        {isPending ? (
          <div className="grid gap-3">
            <Skeleton className="aspect-video w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        ) : isError ? (
          <ErrorState error={error} onRetry={() => refetch()} />
        ) : (
          <div className="grid gap-4">
            {data.media.map((m) => (
              <MediaPlayer key={m.id} media={m} />
            ))}
            {data.submission.caption && (
              <DialogDescription className="text-sm whitespace-pre-line text-foreground">
                {data.submission.caption}
              </DialogDescription>
            )}
            <div className="flex items-center justify-between border-t pt-3">
              <Stats s={data.submission} />
              <span className="text-xs text-muted-foreground">{timeAgo(data.submission.created_at)}</span>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

export function SubmissionGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border bg-card">
          <Skeleton className="aspect-video rounded-none" />
          <div className="space-y-2 p-3">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function SubmissionsTab({ challengeId, type }: { challengeId: string; type: SubmissionType }) {
  const q = useSubmissions(challengeId)
  const [open, setOpen] = useState<string | null>(null)
  const items = q.data?.pages.flatMap((p) => p.data) ?? []

  if (q.isPending) return <SubmissionGridSkeleton />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (items.length === 0)
    return (
      <EmptyState
        icon={Inbox}
        title="No approved submissions yet"
        description="Entries appear here once they pass moderation."
      />
    )
  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((it) => (
          <SubmissionCard key={it.submission.id} item={it} type={type} onOpen={() => setOpen(it.submission.id)} />
        ))}
      </div>
      {q.hasNextPage && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
            {q.isFetchingNextPage && <Loader2 className="animate-spin" />} Load more
          </Button>
        </div>
      )}
      <SubmissionModal id={open} onClose={() => setOpen(null)} />
    </>
  )
}
