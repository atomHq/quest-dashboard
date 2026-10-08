'use client'

import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Flame, Loader2, Sparkles, Trophy } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import { useChallengesFeed, useTrending } from '@/hooks/queries'
import { EmptyState, ErrorState, PageHeader } from '@/components/common'
import { Button, buttonVariants } from '@/components/ui/button'
import { ChallengeCard, ChallengeCardSkeleton, ChallengeGrid } from './challenge-card'

type Sort = 'newest' | 'trending'

function Pill({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        'h-8 shrink-0 rounded-full border px-3 text-sm transition-colors',
        active
          ? 'border-primary bg-primary text-primary-foreground'
          : 'bg-card text-muted-foreground hover:border-foreground/30 hover:text-foreground',
      )}
    >
      {children}
    </button>
  )
}

function Segmented<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T
  options: { value: T; label: React.ReactNode }[]
  onChange: (v: T) => void
}) {
  return (
    <div className="inline-flex rounded-lg border bg-card p-0.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={cn(
            'flex h-7 items-center gap-1.5 rounded-md px-3 text-sm transition-colors',
            value === o.value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function ChallengeFeed() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useSearchParams()

  const sort: Sort = params.get('sort') === 'trending' ? 'trending' : 'newest'
  const statusAll = params.get('status') === 'all'
  const category = params.get('category') ?? undefined

  function setParam(key: string, value: string | null) {
    const next = new URLSearchParams(params)
    if (value === null) next.delete(key)
    else next.set(key, value)
    const qs = next.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  const newest = useChallengesFeed({ status: statusAll ? undefined : 'active', category })
  const trending = useTrending(sort === 'trending')
  const q = sort === 'trending' ? trending : newest
  const items = sort === 'trending' ? (trending.data?.pages.flat() ?? []) : (newest.data?.pages.flatMap((p) => p.data) ?? [])

  return (
    <div>
      <PageHeader
        title="Challenges"
        description="Compete for cash. Every reward pool is held in escrow."
        actions={
          <Segmented<Sort>
            value={sort}
            onChange={(v) => setParam('sort', v === 'newest' ? null : v)}
            options={[
              { value: 'newest', label: <><Sparkles className="size-3.5" /> Newest</> },
              { value: 'trending', label: <><Flame className="size-3.5" /> Trending</> },
            ]}
          />
        }
      />

      {sort === 'newest' && (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Segmented<'active' | 'all'>
            value={statusAll ? 'all' : 'active'}
            onChange={(v) => setParam('status', v === 'all' ? 'all' : null)}
            options={[
              { value: 'active', label: 'Active' },
              { value: 'all', label: 'All' },
            ]}
          />
          <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:px-0 sm:pb-0 [&::-webkit-scrollbar]:hidden">
            <Pill active={!category} onClick={() => setParam('category', null)}>
              All categories
            </Pill>
            {CATEGORIES.map((c) => (
              <Pill key={c} active={category === c} onClick={() => setParam('category', category === c ? null : c)}>
                {c}
              </Pill>
            ))}
          </div>
        </div>
      )}

      {q.isPending ? (
        <ChallengeGrid>
          {Array.from({ length: 6 }, (_, i) => (
            <ChallengeCardSkeleton key={i} />
          ))}
        </ChallengeGrid>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState
          icon={Trophy}
          title={category ? `No ${category} challenges yet` : 'No challenges yet'}
          description="Be the first to put up a reward and get people competing."
          action={
            <Link href="/dashboard/challenges/new" className={buttonVariants()}>
              Create a challenge
            </Link>
          }
        />
      ) : (
        <>
          <ChallengeGrid>
            {items.map((c, i) => (
              <ChallengeCard key={c.id} c={c} index={i} />
            ))}
            {q.isFetchingNextPage &&
              Array.from({ length: 3 }, (_, i) => <ChallengeCardSkeleton key={`s${i}`} />)}
          </ChallengeGrid>
          {q.hasNextPage && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={() => q.fetchNextPage()} disabled={q.isFetchingNextPage}>
                {q.isFetchingNextPage && <Loader2 className="animate-spin" />}
                Load more
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
