'use client'

import Link from 'next/link'
import { Clock, Compass, Pencil, Trophy, UserPlus, UserX } from 'lucide-react'
import { formatNaira } from '@/lib/money'
import { formatDate } from '@/lib/time'
import { isApiError } from '@/lib/api/errors'
import { useJoined, useProfile } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { EmptyState, ErrorState, InitialsAvatar } from '@/components/common'
import { ChallengeCard, ChallengeCardSkeleton, ChallengeGrid } from '@/components/challenge/challenge-card'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

function ComingSoon({ what }: { what: string }) {
  return <EmptyState icon={Clock} title="Coming soon" description={`${what} will show up here soon.`} />
}

function JoinedTab() {
  const q = useJoined()
  if (q.isPending)
    return (
      <ChallengeGrid>
        {Array.from({ length: 3 }, (_, i) => (
          <ChallengeCardSkeleton key={i} />
        ))}
      </ChallengeGrid>
    )
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} />
  if (q.data.length === 0)
    return (
      <EmptyState
        icon={Compass}
        title="No challenges joined yet"
        description="Find a challenge you can win."
        action={
          <Link href="/" className={buttonVariants()}>
            Browse challenges
          </Link>
        }
      />
    )
  return (
    <ChallengeGrid>
      {q.data.map((c, i) => (
        <ChallengeCard key={c.id} c={c} index={i} />
      ))}
    </ChallengeGrid>
  )
}

function Stat({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div>
      <p className="money text-lg font-semibold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

export function ProfileView({ username }: { username: string }) {
  const me = useSession((s) => s.user)
  const q = useProfile(username)

  if (q.isPending)
    return (
      <div className="space-y-6">
        <Skeleton className="h-40 w-full rounded-xl sm:h-52" />
        <div className="flex items-end gap-4 px-4">
          <Skeleton className="-mt-16 size-24 rounded-full" />
          <div className="space-y-2">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
        <Skeleton className="h-16 w-full rounded-xl" />
      </div>
    )
  if (q.isError)
    return isApiError(q.error, 'NOT_FOUND') ? (
      <EmptyState icon={UserX} title="User not found" description={`There's no one called @${username}.`} />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    )

  const p = q.data
  const isMe = me?.id === p.id
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ') || p.username

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border bg-card">
        <div className="relative h-36 bg-gradient-to-br from-primary/25 via-primary/5 to-transparent sm:h-48">
          {p.cover_url && (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={p.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
          )}
        </div>
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex items-end gap-4">
            <InitialsAvatar name={name} src={p.avatar_url} className="-mt-12 size-24 text-2xl ring-4 ring-card" />
            <div className="pb-1">
              <h1 className="text-xl font-semibold">{name}</h1>
              <p className="text-sm text-muted-foreground">@{p.username}</p>
            </div>
          </div>
          {isMe ? (
            <Link href="/settings/profile" className={buttonVariants({ variant: 'outline' })}>
              <Pencil /> Edit profile
            </Link>
          ) : (
            <Tooltip>
              <TooltipTrigger render={<span tabIndex={0} className="w-fit" />}>
                <Button disabled className="pointer-events-none">
                  <UserPlus /> Follow
                </Button>
              </TooltipTrigger>
              <TooltipContent>Following is coming soon</TooltipContent>
            </Tooltip>
          )}
        </div>
        {p.bio && <p className="px-5 pb-5 text-sm whitespace-pre-line text-muted-foreground">{p.bio}</p>}
        <div className="grid grid-cols-2 gap-4 border-t px-5 py-4 sm:grid-cols-4">
          <Stat label="Followers" value={p.followers_count} />
          <Stat label="Following" value={p.following_count} />
          <Stat
            label="Challenges won"
            value={
              <span className="flex items-center gap-1.5">
                <Trophy className="size-4 text-primary" /> {p.total_challenges_won}
              </span>
            }
          />
          <Stat label="Total earnings" value={<span className="text-primary">{formatNaira(p.total_earnings_kobo)}</span>} />
        </div>
        <p className="border-t px-5 py-2.5 text-xs text-muted-foreground">Joined {formatDate(p.created_at)}</p>
      </div>

      <Tabs defaultValue={isMe ? 'joined' : 'created'}>
        <TabsList variant="line" className="border-b pb-0">
          <TabsTrigger value="created" className="px-3 pb-2">Challenges created</TabsTrigger>
          <TabsTrigger value="joined" className="px-3 pb-2">Challenges joined</TabsTrigger>
          <TabsTrigger value="submissions" className="px-3 pb-2">Submissions</TabsTrigger>
        </TabsList>
        <TabsContent value="created" className="pt-4">
          <ComingSoon what="Created challenges" />
        </TabsContent>
        <TabsContent value="joined" className="pt-4">
          {isMe ? <JoinedTab /> : <ComingSoon what="Joined challenges" />}
        </TabsContent>
        <TabsContent value="submissions" className="pt-4">
          <ComingSoon what="Submissions" />
        </TabsContent>
      </Tabs>
    </div>
  )
}
