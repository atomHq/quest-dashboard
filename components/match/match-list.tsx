'use client'

import Link from 'next/link'
import { ChevronRight, Gavel, Plus, Swords } from 'lucide-react'
import { formatNaira } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import type { MatchListItem } from '@/lib/api/types'
import { useDisputes, useMyMatches } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { EmptyState, ErrorState, InitialsAvatar, PageHeader } from '@/components/common'
import { Countdown } from '@/components/challenge/challenge-card'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { MatchStateBadge, OPEN_MATCH_STATES, matchHeadline, sides } from './match-state'

function MatchRow({ m }: { m: MatchListItem }) {
  const h = m.head_to_head
  const admin = m.my_role === 'admin'
  const { them } = sides(m)
  const needsMe = m.my_role === 'opponent' && h.state === 'awaiting_opponent'
  return (
    <Link
      href={`/matches/${m.challenge.id}`}
      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-accent/50"
    >
      <InitialsAvatar name={them.username} src={them.avatar_url} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">
          {admin ? `@${m.creator.username} vs @${m.opponent.username}` : `vs @${them.username}`}
          <span className="font-normal text-muted-foreground"> · {m.challenge.title}</span>
        </p>
        <p className={needsMe ? 'truncate text-xs text-primary' : 'truncate text-xs text-muted-foreground'}>
          {admin && h.disputed_at ? `Disputed ${formatDateTime(h.disputed_at)}` : matchHeadline(m)}
        </p>
      </div>
      <div className="hidden text-right sm:block">
        <p className="money text-sm text-primary">{formatNaira(m.stake_summary.winner_takes)}</p>
        <p className="text-xs text-muted-foreground">
          {h.state === 'awaiting_opponent' || h.state === 'in_play' ? (
            <Countdown deadline={h.state === 'in_play' ? h.report_by : m.challenge.deadline} />
          ) : (
            `${formatNaira(m.stake_summary.stake)} each`
          )}
        </p>
      </div>
      <MatchStateBadge state={h.state} className="hidden md:inline-flex" />
      <ChevronRight className="size-4 text-muted-foreground" />
    </Link>
  )
}

export function MatchRows({ items }: { items: MatchListItem[] }) {
  // Challenges waiting on the viewer go first.
  const sorted = [...items].sort((a, b) => Number(needsAction(b)) - Number(needsAction(a)))
  return (
    <div className="divide-y">
      {sorted.map((m) => (
        <MatchRow key={m.challenge.id} m={m} />
      ))}
    </div>
  )
}

function needsAction(m: MatchListItem) {
  return m.my_role === 'opponent' && m.head_to_head.state === 'awaiting_opponent'
}

function RowsSkeleton({ n = 3 }: { n?: number }) {
  return (
    <div className="grid gap-2 p-4">
      {Array.from({ length: n }, (_, i) => (
        <Skeleton key={i} className="h-12 w-full" />
      ))}
    </div>
  )
}

const newMatchLink = (
  <Link href="/matches/new" className={buttonVariants()}>
    <Plus /> New match
  </Link>
)

/** Dashboard card: matches still in progress. */
export function DashboardMatches() {
  const q = useMyMatches(OPEN_MATCH_STATES)
  return (
    <div className="rounded-xl border bg-card">
      <div className="flex items-center justify-between gap-3 border-b p-4">
        <h2 className="font-medium">Matches</h2>
        <div className="flex gap-2">
          <Link href="/matches" className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
            View all
          </Link>
          <Link href="/matches/new" className={buttonVariants({ variant: 'outline', size: 'sm' })}>
            <Swords /> Challenge someone
          </Link>
        </div>
      </div>
      {q.isPending ? (
        <RowsSkeleton />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="m-4" />
      ) : q.data.length === 0 ? (
        <EmptyState
          icon={Swords}
          title="No matches on"
          description="Challenge a friend to a 1v1 — you both stake, the winner takes the pot."
          className="m-4 border-0"
        />
      ) : (
        <MatchRows items={q.data} />
      )}
    </div>
  )
}

function MatchesTab({ open }: { open: boolean }) {
  const q = useMyMatches(open ? OPEN_MATCH_STATES : ['settled', 'refunded'])
  if (q.isPending) return <RowsSkeleton n={4} />
  if (q.isError) return <ErrorState error={q.error} onRetry={() => q.refetch()} className="m-4" />
  if (q.data.length === 0)
    return (
      <EmptyState
        icon={Swords}
        title={open ? 'No matches on' : 'No finished matches yet'}
        description={open ? 'Challenge someone by their username — you both stake the same amount.' : undefined}
        action={open ? newMatchLink : undefined}
        className="m-4 border-0"
      />
    )
  return <MatchRows items={q.data} />
}

export function MatchesView() {
  return (
    <div className="space-y-6">
      <PageHeader title="Matches" description="1v1 challenges with money on the line. Winner takes the pot." actions={newMatchLink} />
      <Tabs defaultValue="open" className="rounded-xl border bg-card">
        <TabsList variant="line" className="border-b px-4 pb-0">
          <TabsTrigger value="open" className="px-3 pb-2">
            In progress
          </TabsTrigger>
          <TabsTrigger value="done" className="px-3 pb-2">
            Finished
          </TabsTrigger>
        </TabsList>
        <TabsContent value="open">
          <MatchesTab open />
        </TabsContent>
        <TabsContent value="done">
          <MatchesTab open={false} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/** Admin queue of disputed matches, oldest first. */
export function DisputesView() {
  const role = useSession((s) => s.user?.role)
  const isAdmin = role === 'admin'
  const q = useDisputes(isAdmin)

  if (!isAdmin)
    return <EmptyState icon={Gavel} title="Admins only" description="You don't have access to the disputes queue." />
  return (
    <div className="space-y-6">
      <PageHeader title="Disputes" description="Matches whose players reported different winners. Oldest first." />
      <div className="rounded-xl border bg-card">
        {q.isPending ? (
          <RowsSkeleton n={4} />
        ) : q.isError ? (
          <ErrorState error={q.error} onRetry={() => q.refetch()} className="m-4" />
        ) : q.data.length === 0 ? (
          <EmptyState icon={Gavel} title="No disputes" description="Every match is settling on its own." className="m-4 border-0" />
        ) : (
          <MatchRows items={q.data} />
        )}
      </div>
    </div>
  )
}
