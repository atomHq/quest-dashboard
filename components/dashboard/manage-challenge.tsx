'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Check,
  ExternalLink,
  FileQuestion,
  Inbox,
  Loader2,
  Lock,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  Trophy,
  UserPlus,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { CATEGORIES } from '@/lib/constants'
import { challengesApi, submissionsApi, usersApi } from '@/lib/api/endpoints'
import { errorMessage, isApiError } from '@/lib/api/errors'
import type { Challenge, ChallengeDetail, ChallengeStatus, RewardTier, Submission, UpdateChallengeInput } from '@/lib/api/types'
import { applyApiError } from '@/lib/form-errors'
import { editChallengeSchema, type EditChallengeValues } from '@/lib/schemas'
import { qk, useAllSubmissions, useChallenge, useReviewSubmissions } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { EmptyState, ErrorState, FormError, StatusBadge } from '@/components/common'
import { Field } from '@/components/common/field'
import { RichTextEditor } from '@/components/common/rich-text-editor'
import { Countdown, ParticipantsCount } from '@/components/challenge/challenge-card'
import { EscrowBadge, RewardTiers } from '@/components/challenge/reward-tiers'
import { SubmissionCard, SubmissionGridSkeleton, SubmissionModal } from '@/components/challenge/submissions'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Status timeline
// ---------------------------------------------------------------------------

const FLOW: { status: ChallengeStatus; label: string; hint: string }[] = [
  { status: 'draft', label: 'Draft', hint: 'Not yet live' },
  { status: 'active', label: 'Active', hint: 'Accepting entries' },
  { status: 'closed', label: 'Closed', hint: 'Pick winners' },
  { status: 'judging', label: 'Paying out', hint: 'Winners chosen' },
  { status: 'completed', label: 'Completed', hint: 'All paid' },
]

function StatusTimeline({ status }: { status: ChallengeStatus }) {
  if (status === 'cancelled')
    return (
      <div className="flex items-center gap-3 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm">
        <XCircle className="size-5 text-destructive" />
        <div>
          <p className="font-medium text-destructive">Cancelled</p>
          <p className="text-muted-foreground">This challenge was cancelled and will not pay out.</p>
        </div>
      </div>
    )
  const current = FLOW.findIndex((f) => f.status === status)
  return (
    <ol className="grid grid-cols-5 gap-1 rounded-xl border bg-card p-4">
      {FLOW.map((f, i) => {
        const done = i < current
        const active = i === current
        return (
          <li key={f.status} className="flex flex-col items-center gap-2 text-center">
            <div className="flex w-full items-center">
              <span className={cn('h-0.5 flex-1', i === 0 ? 'opacity-0' : i <= current ? 'bg-primary' : 'bg-border')} />
              <span
                className={cn(
                  'grid size-7 shrink-0 place-items-center rounded-full border text-xs transition-colors',
                  done && 'border-primary bg-primary text-primary-foreground',
                  active && 'border-primary text-primary ring-4 ring-primary/15',
                  !done && !active && 'text-muted-foreground',
                )}
              >
                {done ? <Check className="size-3.5" /> : <span className="money">{i + 1}</span>}
              </span>
              <span className={cn('h-0.5 flex-1', i === FLOW.length - 1 ? 'opacity-0' : i < current ? 'bg-primary' : 'bg-border')} />
            </div>
            <div>
              <p className={cn('text-xs font-medium', !active && 'text-muted-foreground')}>{f.label}</p>
              <p className="hidden text-[11px] text-muted-foreground sm:block">{f.hint}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ---------------------------------------------------------------------------
// Draft edit (PATCH)
// ---------------------------------------------------------------------------

function toLocalInput(iso: string) {
  const d = new Date(iso)
  return new Date(d.getTime() - d.getTimezoneOffset() * 60_000).toISOString().slice(0, 16)
}

function EditDraftForm({ c }: { c: Challenge }) {
  const queryClient = useQueryClient()
  const form = useForm<EditChallengeValues>({
    resolver: zodResolver(editChallengeSchema),
    defaultValues: {
      title: c.title,
      description: c.description,
      category: (CATEGORIES as readonly string[]).includes(c.category) ? (c.category as EditChallengeValues['category']) : 'Other',
      rules: c.rules ?? '',
      max_participants: c.max_participants?.toString() ?? '',
      deadline: toLocalInput(c.deadline),
    },
  })
  const { errors, isSubmitting, dirtyFields, isDirty } = form.formState

  const onSubmit = form.handleSubmit(async (v) => {
    const body: UpdateChallengeInput = {}
    if (dirtyFields.title) body.title = v.title.trim()
    if (dirtyFields.description) body.description = v.description
    if (dirtyFields.category) body.category = v.category
    if (dirtyFields.rules) body.rules = v.rules.trim() || null
    if (dirtyFields.max_participants) body.max_participants = v.max_participants.trim() ? Number(v.max_participants) : null
    if (dirtyFields.deadline) body.deadline = new Date(v.deadline).toISOString()
    try {
      await challengesApi.update(c.id, body)
      await queryClient.invalidateQueries({ queryKey: qk.challenge(c.id) })
      toast.success('Challenge updated')
      form.reset(v)
    } catch (err) {
      applyApiError(err, form.setError, ['title', 'description', 'category', 'rules', 'max_participants', 'deadline'])
    }
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4 rounded-xl border bg-card p-5" noValidate>
      <div>
        <h2 className="font-medium">Edit draft</h2>
        <p className="text-xs text-muted-foreground">Reward pool and tiers can&apos;t be changed after creation.</p>
      </div>
      <FormError message={errors.root?.server?.message} />
      <Field label="Title" error={errors.title?.message}>
        {(p) => <Input {...p} {...form.register('title')} />}
      </Field>
      <Field label="Description" error={errors.description?.message}>
        {(p) => (
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <RichTextEditor id={p.id} value={field.value} onChange={field.onChange} onBlur={field.onBlur} invalid={p['aria-invalid']} />
            )}
          />
        )}
      </Field>
      <div className="grid gap-4 sm:grid-cols-3">
        <Field label="Category" error={errors.category?.message}>
          {(p) => (
            <Controller
              control={form.control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={(v) => v && field.onChange(v)}>
                  <SelectTrigger id={p.id} className="h-9 w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((x) => (
                      <SelectItem key={x} value={x}>
                        {x}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          )}
        </Field>
        <Field label="Max participants" optional error={errors.max_participants?.message}>
          {(p) => <Input {...p} inputMode="numeric" placeholder="Unlimited" {...form.register('max_participants')} />}
        </Field>
        <Field label="Deadline" error={errors.deadline?.message}>
          {(p) => <Input {...p} type="datetime-local" {...form.register('deadline')} />}
        </Field>
      </div>
      <Field label="Rules" optional error={errors.rules?.message}>
        {(p) => <Textarea {...p} rows={3} {...form.register('rules')} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Save changes
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Close early
// ---------------------------------------------------------------------------

function CloseChallenge({ c }: { c: Challenge }) {
  const [open, setOpen] = useState(false)
  const queryClient = useQueryClient()
  const close = useMutation({
    mutationFn: () => challengesApi.close(c.id),
    onSuccess: () => {
      setOpen(false)
      toast.success('Challenge closed. Time to pick your winners.')
      queryClient.invalidateQueries({ queryKey: qk.challenge(c.id) })
      queryClient.invalidateQueries({ queryKey: qk.myChallenges })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })
  return (
    <div className="flex flex-col gap-3 rounded-xl border bg-card p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium">Close early</p>
        <p className="text-sm text-muted-foreground">Stop accepting entries now and move on to picking winners.</p>
      </div>
      <Button variant="destructive" onClick={() => setOpen(true)}>
        Close challenge
      </Button>
      <Dialog open={open} onOpenChange={(o) => !close.isPending && setOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Close this challenge now?</DialogTitle>
            <DialogDescription>
              No new entries will be accepted, even though the deadline hasn&apos;t passed. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Keep it open</DialogClose>
            <Button variant="destructive" onClick={() => close.mutate()} disabled={close.isPending}>
              {close.isPending && <Loader2 className="animate-spin" />} Close challenge
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Invite (direct challenges)
// ---------------------------------------------------------------------------

function InviteForm({ c }: { c: Challenge }) {
  const [username, setUsername] = useState('')
  const invite = useMutation({
    mutationFn: async (u: string) => {
      const profile = await usersApi.byUsername(u)
      await challengesApi.invite(c.id, profile.id)
      return profile.username
    },
    onSuccess: (u) => {
      toast.success(`Invite sent to @${u}`)
      setUsername('')
    },
    onError: (err) => toast.error(isApiError(err, 'NOT_FOUND') ? 'No user with that username.' : errorMessage(err)),
  })
  return (
    <form
      className="grid gap-3 rounded-xl border bg-card p-5"
      onSubmit={(e) => {
        e.preventDefault()
        const u = username.trim().replace(/^@/, '').toLowerCase()
        if (u) invite.mutate(u)
      }}
    >
      <div>
        <p className="font-medium">Invite participants</p>
        <p className="text-sm text-muted-foreground">This challenge is invite-only. Invite people by username.</p>
      </div>
      <div className="flex gap-2">
        <Input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="@username" aria-label="Username to invite" />
        <Button type="submit" disabled={invite.isPending || !username.trim()}>
          {invite.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />} Invite
        </Button>
      </div>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Winner selection (closed only)
// ---------------------------------------------------------------------------

function WinnerPicker({ c, tiers }: { c: Challenge; tiers: RewardTier[] }) {
  const queryClient = useQueryClient()
  const subs = useAllSubmissions(c.id)
  const sorted = useMemo(() => [...tiers].sort((a, b) => a.rank - b.rank), [tiers])
  const [picks, setPicks] = useState<Record<number, string | null>>({})
  const [preview, setPreview] = useState<string | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)

  const items = useMemo(
    () =>
      (subs.data ?? []).map((s, i) => ({
        value: s.submission.id,
        label: `#${i + 1} · ${(s.submission.caption || 'Untitled entry').slice(0, 40)}`,
      })),
    [subs.data],
  )
  const labelFor = (id: string | null | undefined) => items.find((i) => i.value === id)?.label
  const chosen = new Set(Object.values(picks).filter(Boolean))
  const complete = sorted.every((t) => picks[t.rank])

  const submit = useMutation({
    mutationFn: () =>
      challengesApi.selectWinners(
        c.id,
        sorted.map((t) => ({ submission_id: picks[t.rank]!, rank: t.rank })),
      ),
    onSuccess: () => {
      setConfirmOpen(false)
      toast.success('Winners locked in. Payouts are processing.')
      queryClient.invalidateQueries({ queryKey: qk.challenge(c.id) })
      queryClient.invalidateQueries({ queryKey: qk.wallet })
    },
    onError: (err) => {
      setConfirmOpen(false)
      toast.error(errorMessage(err))
    },
  })

  if (subs.isPending) return <Skeleton className="h-64 w-full rounded-xl" />
  if (subs.isError) return <ErrorState error={subs.error} onRetry={() => subs.refetch()} />

  const notEnough = items.length < sorted.length

  return (
    <div className="grid gap-4 rounded-xl border border-primary/40 bg-gradient-to-b from-primary/[0.06] to-card p-5">
      <div className="flex items-start gap-3">
        <Trophy className="mt-0.5 size-5 text-primary" />
        <div>
          <h2 className="font-medium">Pick your winners</h2>
          <p className="text-sm text-muted-foreground">
            Assign one approved submission to each reward tier. Payouts start as soon as you confirm.
          </p>
        </div>
      </div>

      {notEnough && (
        <p className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
          <ShieldAlert className="size-4 text-destructive" />
          You have {sorted.length} reward tier{sorted.length === 1 ? '' : 's'} but only {items.length} approved submission
          {items.length === 1 ? '' : 's'}. Approve entries below to pick from them.
        </p>
      )}

      <div className="grid gap-2">
        {sorted.map((t) => (
          <div key={t.id} className="grid items-center gap-2 rounded-lg border bg-background/60 p-3 sm:grid-cols-[9rem_1fr_auto]">
            <div>
              <p className="text-sm font-medium">Rank {t.rank}</p>
              <p className="money text-xs text-primary">{formatNaira(t.amount)}</p>
            </div>
            <Select
              items={items}
              value={picks[t.rank] ?? null}
              onValueChange={(v) => setPicks((p) => ({ ...p, [t.rank]: (v as string | null) ?? null }))}
            >
              <SelectTrigger className="h-9 w-full" aria-label={`Winner for rank ${t.rank}`}>
                <SelectValue placeholder="Choose a submission" />
              </SelectTrigger>
              <SelectContent>
                {items.map((it) => (
                  <SelectItem key={it.value} value={it.value} disabled={chosen.has(it.value) && picks[t.rank] !== it.value}>
                    {it.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button variant="ghost" size="sm" disabled={!picks[t.rank]} onClick={() => setPreview(picks[t.rank] ?? null)}>
              Preview
            </Button>
          </div>
        ))}
      </div>

      <div className="flex justify-end">
        <Button disabled={!complete || submit.isPending} onClick={() => setConfirmOpen(true)}>
          <Trophy /> Confirm winners
        </Button>
      </div>

      <Dialog open={confirmOpen} onOpenChange={(o) => !submit.isPending && setConfirmOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm winners?</DialogTitle>
            <DialogDescription>Escrowed funds will be paid out. This can&apos;t be undone.</DialogDescription>
          </DialogHeader>
          <ul className="grid gap-1.5 text-sm">
            {sorted.map((t) => (
              <li key={t.id} className="flex justify-between gap-3">
                <span className="truncate">
                  Rank {t.rank}: <span className="text-muted-foreground">{labelFor(picks[t.rank])}</span>
                </span>
                <span className="money text-primary">{formatNaira(t.amount)}</span>
              </li>
            ))}
          </ul>
          <DialogFooter>
            <DialogClose render={<Button variant="outline" />}>Go back</DialogClose>
            <Button onClick={() => submit.mutate()} disabled={submit.isPending}>
              {submit.isPending && <Loader2 className="animate-spin" />} Pay winners
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <SubmissionModal id={preview} onClose={() => setPreview(null)} />
    </div>
  )
}

// ---------------------------------------------------------------------------
// Review queue (active / closed)
// ---------------------------------------------------------------------------

const REVIEW_LABEL: Record<Submission['status'], string> = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  winner: 'Winner',
  disqualified: 'Disqualified',
}

function ReviewQueue({ c }: { c: Challenge }) {
  const queryClient = useQueryClient()
  const subs = useReviewSubmissions(c.id)
  const [open, setOpen] = useState<string | null>(null)
  const review = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => submissionsApi.review(id, status),
    onSuccess: (s) => {
      toast.success(s.status === 'approved' ? 'Entry approved' : 'Entry rejected')
      // Prefix match refreshes the review queue and the approved list the winner picker reads.
      queryClient.invalidateQueries({ queryKey: qk.submissions(c.id) })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const items = useMemo(
    () => [...(subs.data ?? [])].sort((a, b) => Number(b.submission.status === 'pending') - Number(a.submission.status === 'pending')),
    [subs.data],
  )
  const pending = items.filter((it) => it.submission.status === 'pending').length

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Review entries</h2>
        {subs.data && (
          <span className="text-xs text-muted-foreground">
            <span className="money">{pending}</span> pending · <span className="money">{items.length}</span> total
          </span>
        )}
      </div>
      {subs.isPending ? (
        <SubmissionGridSkeleton count={3} />
      ) : subs.isError ? (
        <ErrorState error={subs.error} onRetry={() => subs.refetch()} />
      ) : items.length === 0 ? (
        <EmptyState icon={Inbox} title="No entries yet" description="Entries appear here as participants submit them." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((it) => {
            const s = it.submission
            const busy = review.isPending && review.variables?.id === s.id
            const decidable = s.status === 'pending' || s.status === 'approved' || s.status === 'rejected'
            return (
              <div key={s.id} className="flex flex-col gap-2">
                <SubmissionCard item={it} type={c.submission_type} onOpen={() => setOpen(s.id)} />
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'text-xs',
                      s.status === 'pending' && 'text-primary',
                      s.status === 'approved' && 'text-success',
                      s.status === 'rejected' && 'text-destructive',
                      s.status !== 'pending' && s.status !== 'approved' && s.status !== 'rejected' && 'text-muted-foreground',
                    )}
                  >
                    {REVIEW_LABEL[s.status]}
                  </span>
                  {decidable && (
                    <div className="flex gap-1.5">
                      {s.status !== 'rejected' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={review.isPending}
                          onClick={() => review.mutate({ id: s.id, status: 'rejected' })}
                        >
                          {busy && review.variables?.status === 'rejected' ? <Loader2 className="animate-spin" /> : <ThumbsDown />} Reject
                        </Button>
                      )}
                      {s.status !== 'approved' && (
                        <Button size="sm" disabled={review.isPending} onClick={() => review.mutate({ id: s.id, status: 'approved' })}>
                          {busy && review.variables?.status === 'approved' ? <Loader2 className="animate-spin" /> : <ThumbsUp />} Approve
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <SubmissionModal id={open} onClose={() => setOpen(null)} />
    </section>
  )
}

// ---------------------------------------------------------------------------
// Approved submissions
// ---------------------------------------------------------------------------

function ApprovedSubmissions({ c }: { c: Challenge }) {
  const subs = useAllSubmissions(c.id)
  const [open, setOpen] = useState<string | null>(null)
  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-medium">Approved submissions</h2>
        {subs.data && <span className="money text-xs text-muted-foreground">{subs.data.length}</span>}
      </div>
      {subs.isPending ? (
        <SubmissionGridSkeleton count={3} />
      ) : subs.isError ? (
        <ErrorState error={subs.error} onRetry={() => subs.refetch()} />
      ) : subs.data.length === 0 ? (
        <EmptyState icon={Inbox} title="No approved submissions yet" description="Entries show up here after moderation." />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {subs.data.map((it) => (
            <SubmissionCard key={it.submission.id} item={it} type={c.submission_type} onOpen={() => setOpen(it.submission.id)} />
          ))}
        </div>
      )}
      <SubmissionModal id={open} onClose={() => setOpen(null)} />
    </section>
  )
}

// ---------------------------------------------------------------------------

function Sidebar({ data }: { data: ChallengeDetail }) {
  const { challenge: c, reward_tiers, escrow_summary } = data
  return (
    <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
      <div className="space-y-4 rounded-xl border bg-card p-5">
        <div>
          <p className="text-xs tracking-wide text-muted-foreground uppercase">Reward pool</p>
          <p className="money text-3xl font-semibold text-primary">{formatNaira(c.reward_pool_amount)}</p>
        </div>
        <EscrowBadge summary={escrow_summary} />
        <div className="grid gap-2 border-t pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform fee</span>
            <span className="money">{formatNaira(escrow_summary.platform_fee_amount)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Participants</span>
            <ParticipantsCount c={c} />
          </div>
          <div className="flex justify-between gap-2">
            <span className="text-muted-foreground">Deadline</span>
            <span className="text-right">
              <Countdown deadline={c.deadline} className="block first-letter:uppercase" />
              <span className="text-xs text-muted-foreground">{formatDateTime(c.deadline)}</span>
            </span>
          </div>
        </div>
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-5">
        <p className="text-sm font-medium">Reward tiers</p>
        <RewardTiers tiers={reward_tiers} />
      </div>
    </aside>
  )
}

export function ManageChallengeView({ id }: { id: string }) {
  const userId = useSession((s) => s.user?.id)
  const q = useChallenge(id, { pollWhile: (d) => d.challenge.status === 'judging' })

  if (q.isPending)
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-2/3" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
          <Skeleton className="h-80 rounded-xl" />
          <Skeleton className="h-80 rounded-xl" />
        </div>
      </div>
    )
  if (q.isError)
    return isApiError(q.error, 'NOT_FOUND') ? (
      <EmptyState icon={FileQuestion} title="Challenge not found" action={<Link href="/dashboard" className={buttonVariants({ variant: 'outline' })}>Back to dashboard</Link>} />
    ) : (
      <ErrorState error={q.error} onRetry={() => q.refetch()} />
    )

  const { challenge: c, reward_tiers } = q.data
  if (c.creator_id !== userId)
    return (
      <EmptyState
        icon={Lock}
        title="Only the creator can manage this challenge"
        action={
          <Link href={`/challenges/${c.id}`} className={buttonVariants({ variant: 'outline' })}>
            View challenge
          </Link>
        }
      />
    )

  return (
    <div className="space-y-6">
      <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Dashboard
      </Link>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <StatusBadge status={c.status} />
            <span className="text-xs text-muted-foreground">{c.category}</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{c.title}</h1>
        </div>
        <Link href={`/challenges/${c.id}`} className={buttonVariants({ variant: 'outline' })}>
          <ExternalLink /> Public page
        </Link>
      </div>

      <StatusTimeline status={c.status} />

      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          {c.status === 'draft' && <EditDraftForm c={c} />}
          {c.status === 'active' && c.challenge_type === 'direct' && <InviteForm c={c} />}
          {c.status === 'active' && <CloseChallenge c={c} />}
          {c.status === 'closed' && <WinnerPicker c={c} tiers={reward_tiers} />}
          {c.status === 'judging' && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-500/30 bg-blue-500/10 p-4 text-sm">
              <Loader2 className="size-5 animate-spin text-blue-400" />
              <div>
                <p className="font-medium">Paying out winners</p>
                <p className="text-muted-foreground">This page updates automatically when payouts complete.</p>
              </div>
            </div>
          )}
          {c.status === 'completed' && (
            <div className="flex items-center gap-3 rounded-xl border border-success/30 bg-success/10 p-4 text-sm">
              <Check className="size-5 text-success" />
              <div>
                <p className="font-medium">Completed</p>
                <p className="text-muted-foreground">
                  All winners have been paid{c.completed_at ? ` · ${formatDateTime(c.completed_at)}` : ''}.
                </p>
              </div>
            </div>
          )}
          {c.status === 'active' || c.status === 'closed' ? <ReviewQueue c={c} /> : <ApprovedSubmissions c={c} />}
        </div>
        <Sidebar data={q.data} />
      </div>
    </div>
  )
}
