'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Ban,
  CheckCircle2,
  Clock,
  Gavel,
  Hourglass,
  Loader2,
  ScrollText,
  ShieldAlert,
  Swords,
  Trophy,
  Undo2,
  Wallet,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { matchesApi, adminApi } from '@/lib/api/endpoints'
import { errorMessage, isApiError } from '@/lib/api/errors'
import { formatNaira } from '@/lib/money'
import { formatDateTime, remaining } from '@/lib/time'
import type { HeadToHeadOutcome, MatchPlayer, MatchReport, MatchView } from '@/lib/api/types'
import { qk, useMatch } from '@/hooks/queries'
import { useNow } from '@/hooks/use-now'
import { EmptyState, ErrorState, FormError, InitialsAvatar } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { MatchStateBadge, matchHeadline, sides } from './match-state'
import { PriceRow, ShortfallNotice, TopUpButton, useStakeFunds } from './stake-funds'
import { ReportDialog } from './report-dialog'
import { EvidenceSection } from './evidence'

/** Query param the deposit callback returns with, to reopen the accept dialog. */
const ACCEPT_PARAM = 'accept'

function useMatchMutation(m: MatchView, fn: (id: string) => Promise<MatchView>, success: string) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => fn(m.challenge.id),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.match(m.challenge.id), updated)
      queryClient.invalidateQueries({ queryKey: qk.matches })
      queryClient.invalidateQueries({ queryKey: qk.wallet })
      queryClient.invalidateQueries({ queryKey: qk.joined })
      toast.success(success)
    },
    onError: (err) => {
      // The match moved on (accepted elsewhere, timed out): show its current state.
      if (isApiError(err, 'MATCH_NOT_PENDING') || isApiError(err, 'MATCH_EXPIRED'))
        queryClient.invalidateQueries({ queryKey: qk.match(m.challenge.id) })
      if (isApiError(err, 'INSUFFICIENT_BALANCE')) queryClient.invalidateQueries({ queryKey: qk.wallet })
    },
  })
}

function ConfirmDialog({
  open,
  onOpenChange,
  title,
  description,
  confirm,
  destructive,
  pending,
  error,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
  title: string
  description: React.ReactNode
  confirm: string
  destructive?: boolean
  pending: boolean
  error?: unknown
  onConfirm: () => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {error != null && <FormError message={errorMessage(error)} />}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Back</DialogClose>
          <Button variant={destructive ? 'destructive' : 'default'} onClick={onConfirm} disabled={pending}>
            {pending && <Loader2 className="animate-spin" />} {confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** The opponent stakes to accept, topping up first when the wallet is short. */
function AcceptDialog({ match: m, open, onOpenChange }: { match: MatchView; open: boolean; onOpenChange: (o: boolean) => void }) {
  const pathname = usePathname()
  const stake = m.stake_summary.stake
  const funds = useStakeFunds(stake)
  const accept = useMatchMutation(m, matchesApi.accept, "You're in — good luck!")

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) accept.reset()
        onOpenChange(o)
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Stake {formatNaira(stake)} and accept</DialogTitle>
          <DialogDescription>
            Your stake is held in escrow with @{m.creator.username}&apos;s. The winner takes{' '}
            {formatNaira(m.stake_summary.winner_takes)}.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-2 rounded-lg border bg-background/50 p-4">
          <PriceRow label="Your stake" value={formatNaira(stake)} />
          <PriceRow label="Platform fee (on settlement)" value={formatNaira(2 * m.stake_summary.fee_per_stake)} />
          <PriceRow label="Winner takes" value={<span className="text-primary">{formatNaira(m.stake_summary.winner_takes)}</span>} />
          <PriceRow
            label="Available balance"
            className="border-t pt-2"
            value={
              funds.wallet.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span className={funds.enough ? 'text-success' : undefined}>{formatNaira(funds.available)}</span>
              )
            }
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Once you accept, neither of you can back out. If nobody reports a result by the deadline, both stakes are refunded
          in full.
        </p>
        {accept.isError && <FormError message={errorMessage(accept.error)} />}
        {!funds.wallet.isPending && !funds.enough && <ShortfallNotice shortfall={funds.shortfall} />}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          {funds.enough ? (
            <Button onClick={() => accept.mutate(undefined, { onSuccess: () => onOpenChange(false) })} disabled={accept.isPending}>
              {accept.isPending ? <Loader2 className="animate-spin" /> : <Wallet />} Stake {formatNaira(stake)} &amp; accept
            </Button>
          ) : (
            <TopUpButton
              shortfall={funds.shortfall}
              available={funds.available}
              returnTo={`${pathname}?${ACCEPT_PARAM}=1`}
              disabled={funds.wallet.isPending}
            />
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/** What the viewer can do now, by role and state. */
function ActionPanel({ match: m }: { match: MatchView }) {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const h = m.head_to_head
  const { me, them } = sides(m)
  const [acceptOpen, setAcceptOpen] = useState(false)
  const [declineOpen, setDeclineOpen] = useState(false)
  const [cancelOpen, setCancelOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)
  const decline = useMatchMutation(m, matchesApi.decline, 'Match declined')
  const cancel = useMatchMutation(m, matchesApi.cancel, 'Match cancelled — your stake is on its way back')

  // Back from a top-up: reopen the accept dialog (never charge automatically).
  useEffect(() => {
    if (search.get(ACCEPT_PARAM) === '1' && h.state === 'awaiting_opponent' && m.my_role === 'opponent') {
      setAcceptOpen(true)
      router.replace(pathname, { scroll: false })
    }
  }, [search, h.state, m.my_role, router, pathname])

  const myReport = m.reports.find((r) => r.reporter_id === me.id)
  const theirReport = m.reports.find((r) => r.reporter_id === them.id)

  if (m.my_role === 'admin') return h.state === 'disputed' ? <ResolvePanel match={m} /> : null

  switch (h.state) {
    case 'awaiting_opponent':
      if (m.my_role === 'opponent')
        return (
          <div className="grid gap-2">
            <Button className="h-11 w-full" onClick={() => setAcceptOpen(true)}>
              <Swords /> Accept · stake {formatNaira(m.stake_summary.stake)}
            </Button>
            <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setDeclineOpen(true)}>
              Decline
            </Button>
            <AcceptDialog match={m} open={acceptOpen} onOpenChange={setAcceptOpen} />
            <ConfirmDialog
              open={declineOpen}
              onOpenChange={setDeclineOpen}
              title="Decline this match?"
              description={`@${them.username} gets their stake back. You won't be charged anything.`}
              confirm="Decline"
              destructive
              pending={decline.isPending}
              error={decline.error ?? undefined}
              onConfirm={() => decline.mutate(undefined, { onSuccess: () => setDeclineOpen(false) })}
            />
          </div>
        )
      return (
        <div className="grid gap-2">
          <Button className="h-11 w-full" disabled>
            <Hourglass /> Waiting for @{them.username}
          </Button>
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setCancelOpen(true)}>
            <Undo2 /> Cancel &amp; refund my stake
          </Button>
          <ConfirmDialog
            open={cancelOpen}
            onOpenChange={setCancelOpen}
            title="Cancel this match?"
            description={`Your ${formatNaira(m.stake_summary.stake)} stake is returned in full.`}
            confirm="Cancel match"
            destructive
            pending={cancel.isPending}
            error={cancel.error ?? undefined}
            onConfirm={() => cancel.mutate(undefined, { onSuccess: () => setCancelOpen(false) })}
          />
        </div>
      )

    case 'in_play':
      return (
        <div className="grid gap-2">
          {myReport ? (
            <Button className="h-11 w-full" disabled>
              <CheckCircle2 /> Result reported
            </Button>
          ) : (
            <Button className="h-11 w-full" onClick={() => setReportOpen(true)}>
              <Trophy /> Report result
            </Button>
          )}
          <p className="text-center text-xs text-muted-foreground">
            {myReport
              ? `Waiting for @${them.username}. If they don't report in time, your result stands.`
              : theirReport
                ? `@${them.username} has reported — add yours.`
                : 'Finished playing? Either of you can report first.'}
          </p>
          <ReportDialog match={m} open={reportOpen} onOpenChange={setReportOpen} />
        </div>
      )

    default:
      return null
  }
}

/** Admin decision on a disputed match. */
function ResolvePanel({ match: m }: { match: MatchView }) {
  const queryClient = useQueryClient()
  const [pick, setPick] = useState<HeadToHeadOutcome | null>(null)
  const [note, setNote] = useState('')
  const resolve = useMutation({
    mutationFn: (outcome: HeadToHeadOutcome) => adminApi.resolve(m.challenge.id, outcome, note.trim() || undefined),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.match(m.challenge.id), updated)
      queryClient.invalidateQueries({ queryKey: qk.disputes })
      toast.success(updated.head_to_head.state === 'refunded' ? 'Both stakes refunded' : 'Winner confirmed — paying out')
      setPick(null)
    },
  })
  const label = (o: HeadToHeadOutcome) =>
    o === 'refund' ? 'Refund both players' : `@${o === 'creator' ? m.creator.username : m.opponent.username} won`

  return (
    <div className="grid gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
      <p className="flex items-center gap-2 text-sm font-medium">
        <Gavel className="size-4" /> Resolve dispute
      </p>
      <Textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} placeholder="Note for the players (optional)" />
      <div className="grid gap-2">
        <Button variant="outline" onClick={() => setPick('creator')}>
          <Trophy /> {label('creator')}
        </Button>
        <Button variant="outline" onClick={() => setPick('opponent')}>
          <Trophy /> {label('opponent')}
        </Button>
        <Button variant="ghost" onClick={() => setPick('refund')}>
          <Undo2 /> {label('refund')}
        </Button>
      </div>
      <ConfirmDialog
        open={pick != null}
        onOpenChange={(o) => !o && setPick(null)}
        title={pick ? `${label(pick)}?` : ''}
        description={
          pick === 'refund'
            ? `Each player gets ${formatNaira(m.stake_summary.stake)} back. No fee is charged.`
            : `They are paid ${formatNaira(m.stake_summary.winner_takes)}. This can't be undone.`
        }
        confirm="Confirm"
        pending={resolve.isPending}
        error={resolve.error ?? undefined}
        onConfirm={() => pick && resolve.mutate(pick)}
      />
    </div>
  )
}

function PlayerTile({ player, label, winner }: { player: MatchPlayer; label: string; winner: boolean }) {
  return (
    <Link href={`/u/${player.username}`} className="flex min-w-0 flex-col items-center gap-2 text-center">
      <span className="relative">
        <InitialsAvatar
          name={player.username}
          src={player.avatar_url}
          className={cn('size-16 text-lg', winner && 'ring-2 ring-primary ring-offset-2 ring-offset-card')}
        />
        {winner && (
          <span className="absolute -top-2 -right-2 grid size-6 place-items-center rounded-full bg-primary text-primary-foreground">
            <Trophy className="size-3.5" />
          </span>
        )}
      </span>
      <span className="max-w-full truncate text-sm font-medium">{label}</span>
      <span className="max-w-full truncate text-xs text-muted-foreground">@{player.username}</span>
    </Link>
  )
}

function StateBanner({ match: m }: { match: MatchView }) {
  const h = m.head_to_head
  const now = useNow(30_000)
  const { me, them } = sides(m)
  const winner = h.winner_id === m.creator.id ? m.creator : h.winner_id === m.opponent.id ? m.opponent : null

  const banner: { icon: typeof Clock; tone: string; title: string; body: string; spin?: boolean } = (() => {
    switch (h.state) {
      case 'disputed':
        return {
          icon: ShieldAlert,
          tone: 'border-destructive/30 bg-destructive/5',
          title: 'Results disagree',
          body:
            m.my_role === 'admin'
              ? 'Review both reports and the evidence, then pick a winner or refund both players.'
              : `An admin will review both reports. Add evidence${h.evidence_by ? ` by ${formatDateTime(h.evidence_by)}` : ''}.`,
        }
      case 'settling':
        return { icon: Loader2, spin: true, tone: 'border-blue-500/30 bg-blue-500/5', title: 'Paying the winner', body: 'This only takes a moment.' }
      case 'settled':
        return {
          icon: Trophy,
          tone: 'border-primary/30 bg-primary/5',
          title: winner ? `${winner.id === me.id && m.my_role !== 'admin' ? 'You' : `@${winner.username}`} won ${formatNaira(m.stake_summary.winner_takes)}` : 'Settled',
          body: h.resolution_note ? `Admin note: ${h.resolution_note}` : 'Paid to the winner’s wallet.',
        }
      case 'refunded':
        return {
          icon: Ban,
          tone: 'border-border bg-muted/40',
          title: 'Stakes refunded in full',
          body: h.resolution_note
            ? `Admin note: ${h.resolution_note}`
            : h.accepted_at
              ? 'No result was confirmed, so both players got their stake back.'
              : `@${m.opponent.username} didn’t accept, so @${m.creator.username} got their stake back.`,
        }
      case 'awaiting_opponent': {
        const left = remaining(m.challenge.deadline, now)
        return {
          icon: Clock,
          tone: 'border-border bg-card',
          title: m.my_role === 'opponent' ? `@${them.username} challenged you` : `Waiting for @${them.username}`,
          body: left ? `${m.my_role === 'opponent' ? 'Accept' : 'They have'} ${left} left to accept.` : 'The time to accept has passed.',
        }
      }
      case 'in_play': {
        const playBy = remaining(m.challenge.deadline, now)
        const reportBy = remaining(h.report_by, now)
        return {
          icon: Swords,
          tone: 'border-success/30 bg-success/5',
          title: 'Match on',
          body: playBy
            ? `Play within ${playBy}. Results lock ${formatDateTime(h.report_by)}.`
            : reportBy
              ? `Report the result within ${reportBy}.`
              : 'Results are locking.',
        }
      }
    }
  })()

  const Icon = banner.icon
  return (
    <div className={cn('flex items-start gap-3 rounded-xl border p-4', banner.tone)}>
      <Icon className={cn('mt-0.5 size-5 shrink-0', banner.spin && 'animate-spin')} />
      <div className="space-y-0.5">
        <p className="font-medium">{banner.title}</p>
        <p className="text-sm text-muted-foreground">{banner.body}</p>
      </div>
    </div>
  )
}

function ReportsList({ match: m }: { match: MatchView }) {
  const name = (id: string) => (id === m.creator.id ? m.creator.username : m.opponent.username)
  const line = (r: MatchReport) => {
    const s = r.creator_score != null && r.opponent_score != null ? ` · ${r.creator_score}–${r.opponent_score}` : ''
    return r.winner_id === r.reporter_id ? `says they won${s}` : `conceded to @${name(r.winner_id)}${s}`
  }
  return (
    <section className="rounded-xl border bg-card">
      <div className="border-b p-4">
        <h2 className="font-medium">Results reported</h2>
        {m.head_to_head.best_of != null && (
          <p className="text-xs text-muted-foreground">
            Scores read @{m.creator.username}–@{m.opponent.username}
          </p>
        )}
      </div>
      {m.reports.length === 0 ? (
        <p className="p-4 text-sm text-muted-foreground">No one has reported yet.</p>
      ) : (
        <ul className="divide-y">
          {m.reports.map((r) => (
            <li key={r.reporter_id} className="flex items-center justify-between gap-3 px-4 py-3 text-sm">
              <span>
                <span className="font-medium">@{name(r.reporter_id)}</span> <span className="text-muted-foreground">{line(r)}</span>
              </span>
              <span className="shrink-0 text-xs text-muted-foreground">{formatDateTime(r.created_at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

function MatchSkeleton() {
  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
      <div className="space-y-4">
        <Skeleton className="h-48 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
      <Skeleton className="h-80 rounded-xl" />
    </div>
  )
}

export function MatchDetailView({ id }: { id: string }) {
  const q = useMatch(id)

  if (q.isPending) return <MatchSkeleton />
  if (q.isError)
    return isApiError(q.error, 'NOT_FOUND') ? (
      <EmptyState
        icon={Swords}
        title="Match not found"
        description="It doesn't exist, or you're not one of its players."
        action={
          <Link href="/matches" className={buttonVariants({ variant: 'outline' })}>
            Your matches
          </Link>
        }
      />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    )

  const m = q.data
  const h = m.head_to_head
  const viewerIsPlayer = m.my_role !== 'admin'
  const { me, them } = sides(m)
  const showEvidence = h.state !== 'awaiting_opponent' && !(h.state === 'refunded' && !h.accepted_at)

  return (
    <div className="space-y-6">
      <Link
        href={m.my_role === 'admin' ? '/admin/disputes' : '/matches'}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> {m.my_role === 'admin' ? 'Disputes' : 'Matches'}
      </Link>

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <section className="rounded-xl border bg-card p-5">
            <div className="flex flex-wrap items-center gap-2">
              <MatchStateBadge state={h.state} />
              {h.best_of != null && h.best_of > 1 && <Badge variant="outline">Best of {h.best_of}</Badge>}
              {m.my_role === 'admin' && <Badge variant="outline">Admin view</Badge>}
            </div>
            <h1 className="mt-3 text-2xl font-semibold tracking-tight">{m.challenge.title}</h1>
            <p className="text-sm text-muted-foreground">{matchHeadline(m)}</p>
            <div className="mt-6 grid grid-cols-[1fr_auto_1fr] items-center gap-4">
              <PlayerTile player={me} label={viewerIsPlayer ? 'You' : 'Creator'} winner={h.winner_id === me.id && h.state === 'settled'} />
              <span className="text-xs font-semibold tracking-widest text-muted-foreground">VS</span>
              <PlayerTile
                player={them}
                label="Opponent"
                winner={h.winner_id === them.id && h.state === 'settled'}
              />
            </div>
          </section>

          <StateBanner match={m} />
          {h.state !== 'awaiting_opponent' && <ReportsList match={m} />}
          {showEvidence && <EvidenceSection match={m} />}

          {m.challenge.rules && (
            <section className="rounded-xl border bg-card p-4">
              <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                <ScrollText className="size-4 text-muted-foreground" /> House rules
              </p>
              <p className="text-sm whitespace-pre-line text-muted-foreground">{m.challenge.rules}</p>
            </section>
          )}
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-6">
          <div className="grid gap-3 rounded-xl border bg-card p-5">
            <p className="text-xs tracking-wide text-muted-foreground uppercase">Winner takes</p>
            <p className="money text-3xl font-semibold text-primary">{formatNaira(m.stake_summary.winner_takes)}</p>
            <div className="grid gap-2 border-t pt-3">
              <PriceRow label="Stake each" value={formatNaira(m.stake_summary.stake)} />
              <PriceRow label="Pot" value={formatNaira(m.stake_summary.pot)} />
              <PriceRow label="Platform fee" value={formatNaira(2 * m.stake_summary.fee_per_stake)} />
            </div>
            <div className="grid gap-2 border-t pt-3 text-sm">
              <PriceRow label={h.accepted_at ? 'Play by' : 'Accept by'} value={formatDateTime(m.challenge.deadline)} />
              <PriceRow label="Results lock" value={formatDateTime(h.report_by)} />
            </div>
          </div>
          <ActionPanel match={m} />
        </aside>
      </div>
    </div>
  )
}
