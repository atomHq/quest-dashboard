'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Banknote, CheckCircle2, ExternalLink, Flag, Lock, Plus, Rocket, Settings2 } from 'lucide-react'
import { formatNaira } from '@/lib/money'
import { useMyChallenges, useWallet } from '@/hooks/queries'
import { EmptyState, ErrorState, PageHeader, StatusBadge } from '@/components/common'
import { Countdown, ParticipantsCount } from '@/components/challenge/challenge-card'
import { StatCard } from '@/components/wallet/wallet-view'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'

function Dash() {
  return <span className="money text-muted-foreground">—</span>
}

export function DashboardView() {
  const router = useRouter()
  const wallet = useWallet()
  const mine = useMyChallenges()
  const items = mine.data?.items ?? []
  const supported = mine.data?.supported ?? false
  const active = items.filter((c) => c.status === 'active').length
  const completed = items.filter((c) => c.status === 'completed').length

  return (
    <div className="space-y-6">
      <PageHeader
        title="Creator dashboard"
        description="Track your challenges, escrow and payouts."
        actions={
          <Link href="/dashboard/challenges/new" className={buttonVariants()}>
            <Plus /> New challenge
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active challenges" icon={Flag}>
          {mine.isPending ? <Skeleton className="h-8 w-10" /> : supported ? <span className="money">{active}</span> : <Dash />}
        </StatCard>
        <StatCard label="Escrow held" icon={Lock} highlight>
          {wallet.isPending ? (
            <Skeleton className="h-8 w-28" />
          ) : wallet.data ? (
            <span className="money text-primary">{formatNaira(wallet.data.escrow)}</span>
          ) : (
            <Dash />
          )}
        </StatCard>
        <StatCard label="Completed" icon={CheckCircle2}>
          {mine.isPending ? <Skeleton className="h-8 w-10" /> : supported ? <span className="money">{completed}</span> : <Dash />}
        </StatCard>
        <StatCard label="Total paid out" icon={Banknote} hint="Coming soon">
          <Dash />
        </StatCard>
      </div>

      <div className="rounded-xl border bg-card">
        <div className="border-b p-4">
          <h2 className="font-medium">Your challenges</h2>
        </div>
        {mine.isPending ? (
          <div className="grid gap-2 p-4">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        ) : mine.isError ? (
          <ErrorState error={mine.error} onRetry={() => mine.refetch()} className="m-4" />
        ) : items.length === 0 ? (
          <EmptyState
            icon={Rocket}
            title="Create your first challenge"
            description="Put up a reward pool, set the rules, and watch the entries roll in. Funds are held in escrow until you pick winners."
            className="m-4 border-0"
            action={
              <Link href="/dashboard/challenges/new" className={buttonVariants()}>
                <Plus /> Create your first challenge
              </Link>
            }
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Challenge</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Participants</TableHead>
                <TableHead className="hidden md:table-cell">Deadline</TableHead>
                <TableHead className="pr-4 text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {items.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => router.push(`/dashboard/challenges/${c.id}`)}>
                  <TableCell className="pl-4">
                    <p className="max-w-[18rem] truncate font-medium">{c.title}</p>
                    <p className="money text-xs text-primary">{formatNaira(c.reward_pool_amount)}</p>
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <ParticipantsCount c={c} />
                  </TableCell>
                  <TableCell className="hidden text-xs md:table-cell">
                    <Countdown deadline={c.deadline} />
                  </TableCell>
                  <TableCell className="pr-4 text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex justify-end gap-1">
                      <Link href={`/challenges/${c.id}`} className={buttonVariants({ variant: 'ghost', size: 'icon-sm' })} aria-label="View public page">
                        <ExternalLink />
                      </Link>
                      <Link href={`/dashboard/challenges/${c.id}`} className={buttonVariants({ variant: 'outline', size: 'sm' })}>
                        <Settings2 /> Manage
                      </Link>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>
    </div>
  )
}
