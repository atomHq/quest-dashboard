'use client'

import { useState } from 'react'
import { ArrowLeft, CreditCard, Loader2, Lock, Pencil, Rocket, Ticket, Wallet } from 'lucide-react'
import { cn } from '@/lib/utils'
import { computeFee, formatNaira, tierAmount } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { SUBMISSION_TYPE_LABEL } from '@/lib/constants'
import { errorMessage } from '@/lib/api/errors'
import { draftEntryPriceKobo, draftPoolKobo, isPaidDraft, type CreateDraft, type Step } from '@/lib/create-draft'
import { MIN_TOPUP_KOBO, startDeposit, topUpAmount } from '@/lib/deposit'
import { useWallet } from '@/hooks/queries'
import { FormError } from '@/components/common'
import { RichText } from '@/components/common/rich-text'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'

function Section({ title, step, onEdit, children }: { title: string; step: Step; onEdit: (s: Step) => void; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border bg-background/50 p-4">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs tracking-wide text-muted-foreground uppercase">{title}</p>
        <Button type="button" variant="ghost" size="xs" onClick={() => onEdit(step)}>
          <Pencil /> Edit
        </Button>
      </div>
      {children}
    </div>
  )
}

function Row({ label, value, className }: { label: string; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  )
}

export function StepReview({
  draft,
  error,
  creating,
  onEdit,
  onBack,
  onCreate,
  onTopUpStart,
}: {
  draft: CreateDraft
  error?: string
  creating: boolean
  onEdit: (s: Step) => void
  onBack: () => void
  onCreate: () => void
  /** Persists the idempotency key with the draft before we leave for Paystack. */
  onTopUpStart: (awaiting: NonNullable<CreateDraft['awaitingFunding']>) => void
}) {
  const { details: d, settings: s, rewards: r } = draft
  const wallet = useWallet()
  const [topUpError, setTopUpError] = useState<string | null>(null)
  const [redirecting, setRedirecting] = useState(false)

  const poolKobo = draftPoolKobo(draft)
  const feeKobo = poolKobo > 0 ? computeFee(poolKobo) : 0
  const totalKobo = poolKobo + feeKobo
  const available = wallet.data?.available ?? 0
  const shortfall = Math.max(0, totalKobo - available)
  const enough = wallet.data != null && shortfall === 0
  const tiers = [...(r.tiers ?? [])].sort((a, b) => Number(a.rank) - Number(b.rank))

  const paid = isPaidDraft(draft)
  const priceKobo = draftEntryPriceKobo(draft)
  const feePerEntry = priceKobo > 0 ? computeFee(priceKobo) : 0
  const poolPerEntry = Math.max(0, priceKobo - feePerEntry)

  async function topUp() {
    setTopUpError(null)
    const amount = topUpAmount(shortfall)
    const key =
      draft.awaitingFunding && draft.awaitingFunding.amount === amount ? draft.awaitingFunding.idempotencyKey : crypto.randomUUID()
    onTopUpStart({ idempotencyKey: key, amount })
    setRedirecting(true)
    try {
      await startDeposit({ amount, startAvailable: available, purpose: 'challenge', idempotencyKey: key })
    } catch (err) {
      setRedirecting(false)
      setTopUpError(errorMessage(err))
    }
  }

  return (
    <div className="grid gap-5">
      <FormError message={error} />

      <Section title="Details" step={1} onEdit={onEdit}>
        <p className="font-medium">{d.title}</p>
        <p className="mb-2 text-xs text-muted-foreground">{d.category}</p>
        <div className="max-h-40 overflow-y-auto">
          <RichText value={d.description ?? ''} />
        </div>
        {d.rules?.trim() && <p className="mt-2 text-xs whitespace-pre-line text-muted-foreground">Rules: {d.rules}</p>}
      </Section>

      <Section title="Settings" step={2} onEdit={onEdit}>
        <div className="grid gap-1.5">
          <Row label="Submission type" value={s.submission_type ? SUBMISSION_TYPE_LABEL[s.submission_type] : '—'} />
          <Row label="Who can enter" value={s.challenge_type === 'direct' ? 'Invite only' : 'Public'} />
          <Row label="Winner selection" value={<span className="capitalize">{s.winner_selection}</span>} />
          <Row label="Max participants" value={s.max_participants?.trim() ? s.max_participants : 'Unlimited'} />
          <Row label="Deadline" value={s.deadline ? formatDateTime(new Date(s.deadline).toISOString()) : '—'} />
        </div>
      </Section>

      <Section title="Rewards" step={3} onEdit={onEdit}>
        <div className="grid gap-1.5">
          <Row label="Entry" value={paid ? `Paid · ${formatNaira(priceKobo)}` : 'Free to join'} />
          {tiers.map((t) => (
            <Row
              key={String(t.rank)}
              label={`Rank ${t.rank} · ${t.percentage}%`}
              value={
                paid ? (
                  <span className="text-muted-foreground">{t.percentage}% of the pool</span>
                ) : (
                  <span className="money text-primary">{formatNaira(tierAmount(poolKobo, Number(t.percentage)))}</span>
                )
              }
            />
          ))}
        </div>
      </Section>

      {paid && (
        <div className="overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-b from-primary/[0.07] to-transparent">
          <div className="grid gap-2 p-5">
            <Row label="Entry price" value={<span className="money">{formatNaira(priceKobo)}</span>} />
            <Row label="Platform fee per entry" value={<span className="money">{formatNaira(feePerEntry)}</span>} />
            <Row
              label="Added to the pool per entrant"
              className="border-t pt-3 text-base font-medium"
              value={<span className="money text-xl text-primary">{formatNaira(poolPerEntry)}</span>}
            />
            <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <Ticket className="size-3" /> You aren&apos;t charged. The pool starts at ₦0 and grows as people join; the challenge
              goes live as soon as you publish.
            </p>
          </div>
          <div className="border-t bg-card/60 p-5">
            <Button className="h-11 w-full text-base" onClick={onCreate} disabled={creating}>
              {creating ? <Loader2 className="animate-spin" /> : <Rocket />}
              Publish challenge
            </Button>
          </div>
        </div>
      )}

      {!paid && (
      <div className="overflow-hidden rounded-xl border border-primary/30 bg-gradient-to-b from-primary/[0.07] to-transparent">
        <div className="grid gap-2 p-5">
          <Row label="Reward pool" value={<span className="money">{formatNaira(poolKobo)}</span>} />
          <Row label="Platform fee (5%)" value={<span className="money">{formatNaira(feeKobo)}</span>} />
          <Row
            label="Total charged"
            className="border-t pt-3 text-base font-medium"
            value={<span className="money text-xl text-primary">{formatNaira(totalKobo)}</span>}
          />
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Lock className="size-3" /> Moved from your available balance into escrow the moment you create the challenge.
          </p>
        </div>

        <div className="border-t bg-card/60 p-5">
          {wallet.isPending ? (
            <Skeleton className="h-20 w-full" />
          ) : wallet.isError ? (
            <FormError message={errorMessage(wallet.error)} />
          ) : (
            <div className="grid gap-4">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2 text-muted-foreground">
                  <Wallet className="size-4" /> Available balance
                </span>
                <span className={cn('money font-medium', enough ? 'text-success' : 'text-foreground')}>{formatNaira(available)}</span>
              </div>

              {enough ? (
                <Button className="h-11 w-full text-base" onClick={onCreate} disabled={creating}>
                  {creating ? <Loader2 className="animate-spin" /> : <Rocket />}
                  Create challenge
                </Button>
              ) : (
                <div className="grid gap-3">
                  <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
                    You need <span className="money font-medium text-foreground">{formatNaira(shortfall)}</span> more to fund this
                    challenge.
                  </div>
                  {topUpError && <FormError message={topUpError} />}
                  <Button className="h-11 w-full text-base" onClick={topUp} disabled={redirecting}>
                    {redirecting ? <Loader2 className="animate-spin" /> : <CreditCard />}
                    Top up {formatNaira(topUpAmount(shortfall))} with Paystack
                  </Button>
                  {topUpAmount(shortfall) !== shortfall && (
                    <p className="text-center text-xs text-muted-foreground">
                      Rounded up to the minimum top-up of {formatNaira(MIN_TOPUP_KOBO)}. Any extra stays in your wallet.
                    </p>
                  )}
                  <p className="text-center text-xs text-muted-foreground">
                    Your draft is saved — you&apos;ll come right back here after paying.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      )}

      <div className="flex justify-start border-t pt-5">
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
      </div>
    </div>
  )
}
