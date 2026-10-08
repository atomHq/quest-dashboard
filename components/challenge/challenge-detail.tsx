'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, ChevronDown, Clock, FileQuestion, ScrollText, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { SUBMISSION_TYPE_LABEL } from '@/lib/constants'
import { isApiError } from '@/lib/api/errors'
import { useChallenge } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { EmptyState, ErrorState, InitialsAvatar, StatusBadge, SubmissionTypeIcon } from '@/components/common'
import { RichText } from '@/components/common/rich-text'
import { Badge } from '@/components/ui/badge'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Countdown, ParticipantsCount } from './challenge-card'
import { EscrowBadge, RewardTiers } from './reward-tiers'
import { JoinActions } from './join-actions'
import { ParticipantsTab } from './participants'
import { SubmissionsTab } from './submissions'

export function CreatorChip({ creatorId }: { creatorId: string }) {
  const me = useSession((s) => s.user?.id)
  const isMe = me === creatorId
  // The API only exposes creator_id for now — no profile link until creator info is available.
  return (
    <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <InitialsAvatar name={isMe ? 'You' : 'Creator'} className="size-6 text-[10px]" />
      Posted by <span className="text-foreground">{isMe ? 'You' : 'a Quest creator'}</span>
    </span>
  )
}

function Rules({ rules }: { rules: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rounded-xl border bg-card">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium"
      >
        <span className="flex items-center gap-2">
          <ScrollText className="size-4 text-muted-foreground" /> Rules
        </span>
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      <div className={cn('grid transition-[grid-template-rows] duration-200', open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]')}>
        <div className="overflow-hidden">
          <p className="border-t px-4 py-3 text-sm whitespace-pre-line text-muted-foreground">{rules}</p>
        </div>
      </div>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="space-y-4">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-9 w-3/4" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-6 h-64 w-full rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl" />
    </div>
  )
}

export function ChallengeDetailView({ id }: { id: string }) {
  const { data, isPending, isError, error, refetch } = useChallenge(id)

  if (isPending) return <DetailSkeleton />
  if (isError)
    return isApiError(error, 'NOT_FOUND') || (isApiError(error) && error.status === 400) ? (
      <EmptyState
        icon={FileQuestion}
        title="Challenge not found"
        description="It may have been removed, or the link is wrong."
        action={
          <Link href="/" className={buttonVariants({ variant: 'outline' })}>
            Browse challenges
          </Link>
        }
      />
    ) : (
      <ErrorState error={error} onRetry={() => refetch()} />
    )

  const { challenge: c, reward_tiers, escrow_summary } = data

  return (
    <div>
      <Link href="/" className="mb-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> All challenges
      </Link>

      <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
        <div className="min-w-0 space-y-6">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={c.status} />
              <Badge variant="outline">{c.category}</Badge>
              <Badge variant="outline" className="gap-1">
                <SubmissionTypeIcon type={c.submission_type} className="size-3" />
                {SUBMISSION_TYPE_LABEL[c.submission_type]}
              </Badge>
              {c.challenge_type === 'direct' && <Badge variant="outline">Invite only</Badge>}
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-balance">{c.title}</h1>
            <CreatorChip creatorId={c.creator_id} />
          </div>

          <RichText value={c.description} />
          {c.rules && <Rules rules={c.rules} />}

          <Tabs defaultValue="submissions" className="pt-2">
            <TabsList variant="line" className="border-b pb-0">
              <TabsTrigger value="submissions" className="px-3 pb-2">Submissions</TabsTrigger>
              <TabsTrigger value="participants" className="px-3 pb-2">
                Participants <span className="money text-muted-foreground">{c.participants_count}</span>
              </TabsTrigger>
            </TabsList>
            <TabsContent value="submissions" className="pt-4">
              <SubmissionsTab challengeId={c.id} type={c.submission_type} />
            </TabsContent>
            <TabsContent value="participants" className="pt-4">
              <ParticipantsTab challengeId={c.id} />
            </TabsContent>
          </Tabs>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="space-y-5 rounded-xl border bg-card p-5">
            <div className="space-y-2">
              <p className="text-xs tracking-wide text-muted-foreground uppercase">Reward pool</p>
              <p className="money text-4xl font-semibold text-primary">{formatNaira(c.reward_pool_amount)}</p>
              <EscrowBadge summary={escrow_summary} />
            </div>
            <div className="grid grid-cols-2 gap-3 border-y py-4 text-sm">
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Clock className="size-3.5" /> Deadline
                </p>
                <Countdown deadline={c.deadline} className="mt-1 block font-medium first-letter:uppercase" />
                <p className="text-xs text-muted-foreground">{formatDateTime(c.deadline)}</p>
              </div>
              <div>
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Users className="size-3.5" /> Participants
                </p>
                <p className="mt-1 font-medium">
                  <ParticipantsCount c={c} />
                </p>
              </div>
            </div>
            <JoinActions challenge={c} />
          </div>

          <div className="space-y-3 rounded-xl border bg-card p-5">
            <p className="text-sm font-medium">Reward breakdown</p>
            <RewardTiers tiers={reward_tiers} />
          </div>
        </aside>
      </div>
    </div>
  )
}
