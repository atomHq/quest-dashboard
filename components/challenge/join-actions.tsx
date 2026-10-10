'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { CreditCard, Loader2, LogOut, Send, Settings2, Ticket, UserPlus, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { challengesApi } from '@/lib/api/endpoints'
import { errorMessage, isApiError } from '@/lib/api/errors'
import type { Challenge } from '@/lib/api/types'
import { formatNaira } from '@/lib/money'
import { MIN_TOPUP_KOBO, startDeposit, topUpAmount } from '@/lib/deposit'
import { qk, useInvites, useJoined, useWallet } from '@/hooks/queries'
import { FormError } from '@/components/common'
import { useSession } from '@/stores/session'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SubmitEntryDialog } from './submit-entry-dialog'
import { isPaidChallenge } from './reward-tiers'

function Disabled({ children }: { children: React.ReactNode }) {
  return (
    <Button className="h-11 w-full" disabled>
      {children}
    </Button>
  )
}

/** Query param the deposit callback returns with, to reopen the pay-to-join dialog. */
const JOIN_PARAM = 'join'

function PriceRow({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="money text-right">{value}</span>
    </div>
  )
}

/** Confirms the entry charge for a paid challenge, or sends the user to top up first. */
function PaidJoinDialog({
  challenge: c,
  open,
  onOpenChange,
  joining,
  error,
  onConfirm,
}: {
  challenge: Challenge
  open: boolean
  onOpenChange: (open: boolean) => void
  joining: boolean
  error?: string
  onConfirm: () => void
}) {
  const pathname = usePathname()
  const wallet = useWallet()
  const [topUpError, setTopUpError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const price = c.entry_price ?? 0
  const fee = c.entry_platform_fee
  const available = wallet.data?.available ?? 0
  const shortfall = Math.max(0, price - available)
  const enough = wallet.data != null && shortfall === 0

  async function topUp() {
    setTopUpError(null)
    setRedirecting(true)
    try {
      await startDeposit({
        amount: topUpAmount(shortfall),
        startAvailable: available,
        purpose: 'join',
        returnTo: `${pathname}?${JOIN_PARAM}=1`,
      })
    } catch (err) {
      setRedirecting(false)
      setTopUpError(errorMessage(err))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Join for {formatNaira(price)}</DialogTitle>
          <DialogDescription>
            The entry price is taken from your wallet and goes towards the prize pool.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-2 rounded-lg border bg-background/50 p-4">
          <PriceRow label="Entry price" value={formatNaira(price)} />
          <PriceRow label="Added to the prize pool" value={formatNaira(Math.max(0, price - fee))} />
          <PriceRow
            label="Available balance"
            className="border-t pt-2"
            value={
              wallet.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <span className={enough ? 'text-success' : undefined}>{formatNaira(available)}</span>
              )
            }
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Leave while the challenge is active and you get {formatNaira(Math.max(0, price - fee))} back (the{' '}
          {formatNaira(fee)} platform fee isn&apos;t refunded). If the creator cancels, you&apos;re refunded in full.
        </p>

        {wallet.isError && <FormError message={errorMessage(wallet.error)} />}
        {error && <FormError message={error} />}
        {topUpError && <FormError message={topUpError} />}

        {!wallet.isPending && !enough && (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
            You need <span className="money font-medium text-foreground">{formatNaira(shortfall)}</span> more to join.
            {topUpAmount(shortfall) !== shortfall && (
              <span className="block text-xs text-muted-foreground">
                Top-ups start at {formatNaira(MIN_TOPUP_KOBO)}; any extra stays in your wallet.
              </span>
            )}
          </div>
        )}

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          {enough ? (
            <Button onClick={onConfirm} disabled={joining}>
              {joining ? <Loader2 className="animate-spin" /> : <Wallet />} Pay {formatNaira(price)} &amp; join
            </Button>
          ) : (
            <Button onClick={topUp} disabled={wallet.isPending || redirecting}>
              {redirecting ? <Loader2 className="animate-spin" /> : <CreditCard />} Top up {formatNaira(topUpAmount(shortfall))}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

export function JoinActions({ challenge: c }: { challenge: Challenge }) {
  const status = useSession((s) => s.status)
  const userId = useSession((s) => s.user?.id)
  const pathname = usePathname()
  const router = useRouter()
  const queryClient = useQueryClient()
  const joined = useJoined()
  const isDirect = c.challenge_type === 'direct'
  const invites = useInvites(isDirect)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)
  const [payOpen, setPayOpen] = useState(false)
  const resumed = useRef(false)

  const paid = isPaidChallenge(c)
  const refundKobo = paid ? Math.max(0, c.entry_price! - c.entry_platform_fee) : 0

  const membership = joined.data?.find((j) => j.id === c.id)
  const invite = invites.data?.find((i) => i.challenge_id === c.id && i.status === 'pending')
  const isMember = !!membership && membership.participant_status !== 'withdrawn'
  const ready = status === 'authed' && !joined.isPending && !(isDirect && invites.isPending)

  // Back from a top-up (?join=1): reopen the pay dialog so the user can confirm. Never charge automatically.
  useEffect(() => {
    if (resumed.current || !ready) return
    const params = new URLSearchParams(window.location.search)
    if (params.get(JOIN_PARAM) !== '1') return
    resumed.current = true
    router.replace(pathname, { scroll: false })
    if (paid && !isMember && c.status === 'active') setPayOpen(true)
  }, [ready, paid, isMember, c.status, pathname, router])

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.joined })
    queryClient.invalidateQueries({ queryKey: qk.challenge(c.id) })
    queryClient.invalidateQueries({ queryKey: qk.participants(c.id) })
    if (paid) {
      queryClient.invalidateQueries({ queryKey: qk.wallet })
      queryClient.invalidateQueries({ queryKey: qk.earnings })
    }
  }

  const join = useMutation({
    mutationFn: () => (invite ? challengesApi.acceptInvite(c.id, invite.id) : challengesApi.join(c.id)),
    onSuccess: () => {
      toast.success("You're in! Submit your entry before the deadline.")
      setPayOpen(false)
      refresh()
      queryClient.invalidateQueries({ queryKey: qk.invites })
    },
    onError: (err) => {
      if (isApiError(err, 'ALREADY_JOINED')) {
        setPayOpen(false)
        return refresh()
      }
      // Balance moved since the dialog opened: refetch so it shows the shortfall and the top-up button.
      if (isApiError(err, 'INSUFFICIENT_BALANCE')) return void queryClient.invalidateQueries({ queryKey: qk.wallet })
      // The paid dialog shows the error inline.
      if (!paid) toast.error(errorMessage(err))
      if (isApiError(err, 'INVITE_EXPIRED') || isApiError(err, 'INVITE_NOT_PENDING'))
        queryClient.invalidateQueries({ queryKey: qk.invites })
    },
  })

  const decline = useMutation({
    mutationFn: () => challengesApi.declineInvite(c.id, invite!.id),
    onSuccess: () => {
      toast('Invite declined')
      queryClient.invalidateQueries({ queryKey: qk.invites })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const leave = useMutation({
    mutationFn: () => challengesApi.leave(c.id),
    onSuccess: () => {
      toast('You left the challenge')
      setLeaveOpen(false)
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (status === 'loading') return <Skeleton className="h-11 w-full" />

  if (status === 'anon')
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonVariants({ className: 'h-11 w-full' })}>
        Log in to join
      </Link>
    )

  if (c.creator_id === userId)
    return (
      <Link href={`/dashboard/challenges/${c.id}`} className={buttonVariants({ variant: 'outline', className: 'h-11 w-full' })}>
        <Settings2 /> Manage challenge
      </Link>
    )

  if (joined.isPending || (isDirect && invites.isPending)) return <Skeleton className="h-11 w-full" />

  if (isMember) {
    const submitted = membership.participant_status === 'submitted'
    const canSubmit = c.status === 'active' && membership.participant_status === 'joined'
    return (
      <div className="grid gap-2">
        {submitted ? (
          <Disabled>Entry submitted</Disabled>
        ) : membership.participant_status === 'disqualified' ? (
          <Disabled>Disqualified</Disabled>
        ) : (
          <Button className="h-11 w-full" disabled={!canSubmit} onClick={() => setSubmitOpen(true)}>
            <Send /> Submit entry
          </Button>
        )}
        {c.status === 'active' && !submitted && (
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setLeaveOpen(true)}>
            <LogOut /> Leave challenge
          </Button>
        )}
        <SubmitEntryDialog challenge={c} open={submitOpen} onOpenChange={setSubmitOpen} />
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave this challenge?</DialogTitle>
              <DialogDescription>
                {paid ? (
                  <>
                    You&apos;ll get <span className="money text-foreground">{formatNaira(refundKobo)}</span> back in your wallet
                    — the {formatNaira(c.entry_platform_fee)} platform fee isn&apos;t refunded. Rejoining means paying the
                    entry price again.
                  </>
                ) : (
                  <>You can rejoin later while it&apos;s still active and has space.</>
                )}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Stay</DialogClose>
              <Button variant="destructive" onClick={() => leave.mutate()} disabled={leave.isPending}>
                {leave.isPending && <Loader2 className="animate-spin" />} Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (c.status !== 'active') return <Disabled>Not accepting entries</Disabled>
  if (c.max_participants != null && c.participants_count >= c.max_participants) return <Disabled>Challenge is full</Disabled>
  if (isDirect && !invite) return <Disabled>Invite only</Disabled>

  return (
    <div className="grid gap-2">
      {paid ? (
        <Button
          className="h-11 w-full"
          onClick={() => {
            join.reset()
            setPayOpen(true)
          }}
        >
          <Ticket />
          {invite ? `Accept invite · ${formatNaira(c.entry_price!)}` : `Join for ${formatNaira(c.entry_price!)}`}
        </Button>
      ) : (
        <Button className="h-11 w-full" onClick={() => join.mutate()} disabled={join.isPending}>
          {join.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
          {invite ? 'Accept invite & join' : 'Join challenge'}
        </Button>
      )}
      {paid && (
        <PaidJoinDialog
          challenge={c}
          open={payOpen}
          onOpenChange={setPayOpen}
          joining={join.isPending}
          error={join.error && !isApiError(join.error, 'INSUFFICIENT_BALANCE') ? errorMessage(join.error) : undefined}
          onConfirm={() => join.mutate()}
        />
      )}
      {invite && (
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => decline.mutate()} disabled={decline.isPending}>
          Decline invite
        </Button>
      )}
    </div>
  )
}
