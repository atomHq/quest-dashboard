'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, Loader2, Swords, UserX } from 'lucide-react'
import { toast } from 'sonner'
import { matchSchema, BEST_OF_OPTIONS, type MatchInput, type MatchValues } from '@/lib/schemas'
import { matchesApi } from '@/lib/api/endpoints'
import { ApiError, errorMessage, isApiError } from '@/lib/api/errors'
import { computeFee, formatNaira, matchWinnerTakes, nairaToKobo } from '@/lib/money'
import { readJSON, removeKey, writeJSON } from '@/lib/session-storage'
import { qk, useProfile } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { Field } from '@/components/common/field'
import { FormError, InitialsAvatar, PageHeader } from '@/components/common'
import { Choice } from '@/components/create/steps'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import { PriceRow, ShortfallNotice, TopUpButton, useStakeFunds } from './stake-funds'

/** Survives the Paystack round trip so a top-up doesn't wipe the form. */
const DRAFT_KEY = 'quest:match-draft'

const EMPTY: MatchInput = { opponent: '', title: '', rules: '', best_of: '', stake_naira: '', deadline: '' }

/** Backend field / code → form field. */
const SERVER_FIELD: Record<string, keyof MatchInput> = {
  opponent_username: 'opponent',
  stake: 'stake_naira',
  title: 'title',
  best_of: 'best_of',
  deadline: 'deadline',
  CANNOT_CHALLENGE_SELF: 'opponent',
  STAKE_TOO_LOW: 'stake_naira',
  DEADLINE_IN_PAST: 'deadline',
  DEADLINE_TOO_SOON: 'deadline',
}

function minDeadlineLocal() {
  const d = new Date(Date.now() + 61 * 60 * 1000)
  d.setSeconds(0, 0)
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

/** Shows who the typed username belongs to, so a typo doesn't challenge a stranger. */
function OpponentPreview({ username }: { username: string }) {
  const me = useSession((s) => s.user?.username)
  const q = useProfile(username)
  if (username.toLowerCase() === me?.toLowerCase())
    return <p className="text-xs text-destructive">That&apos;s you — pick someone else.</p>
  if (q.isPending) return <Skeleton className="h-9 w-48" />
  if (q.isError)
    return (
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <UserX className="size-3.5" />
        {isApiError(q.error, 'NOT_FOUND') ? `No one is called @${username}.` : errorMessage(q.error)}
      </p>
    )
  const p = q.data
  const name = [p.first_name, p.last_name].filter(Boolean).join(' ')
  return (
    <div className="flex items-center gap-2 rounded-lg border bg-background/50 px-3 py-2">
      <InitialsAvatar name={name || p.username} src={p.avatar_url} className="size-7 text-[10px]" />
      <div className="min-w-0 text-sm">
        <p className="truncate font-medium">{name || `@${p.username}`}</p>
        {name && <p className="truncate text-xs text-muted-foreground">@{p.username}</p>}
      </div>
    </div>
  )
}

export function NewMatchForm() {
  const router = useRouter()
  const pathname = usePathname()
  const search = useSearchParams()
  const queryClient = useQueryClient()
  // One key per attempt: a double submit or retried request can't open two matches.
  const idempotencyKey = useRef<string>('')
  if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID()

  const form = useForm<MatchInput, unknown, MatchValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: { ...EMPTY, opponent: search.get('opponent') ?? '' },
  })
  const { errors } = form.formState

  // Restore what the user typed before leaving to top up.
  useEffect(() => {
    const draft = readJSON<MatchInput>(DRAFT_KEY)
    if (draft) {
      form.reset({ ...EMPTY, ...draft })
      removeKey(DRAFT_KEY)
    }
  }, [form])

  const [opponent, stakeNaira] = useWatch({ control: form.control, name: ['opponent', 'stake_naira'] })
  const username = useDebounced(String(opponent ?? '').trim().replace(/^@/, ''), 400)
  const validUsername = /^[a-zA-Z0-9_]{3,50}$/.test(username)

  const parsed = matchSchema.shape.stake_naira.safeParse(stakeNaira)
  const stakeKobo = parsed.success && Number.isFinite(parsed.data) && parsed.data > 0 ? nairaToKobo(parsed.data) : 0
  const fee = stakeKobo > 0 ? computeFee(stakeKobo) : 0
  const takes = stakeKobo > fee ? matchWinnerTakes(stakeKobo) : 0
  const funds = useStakeFunds(stakeKobo)

  const create = useMutation({
    mutationFn: (v: MatchValues) =>
      matchesApi.create(
        {
          opponent_username: v.opponent.replace(/^@/, ''),
          title: v.title,
          rules: v.rules || null,
          best_of: v.best_of ? Number(v.best_of) : null,
          stake: nairaToKobo(v.stake_naira),
          deadline: new Date(v.deadline).toISOString(),
        },
        idempotencyKey.current,
      ),
    onSuccess: (m) => {
      queryClient.setQueryData(qk.match(m.challenge.id), m)
      queryClient.invalidateQueries({ queryKey: qk.wallet })
      queryClient.invalidateQueries({ queryKey: qk.matches })
      toast.success(`Challenge sent to @${m.opponent.username}`)
      router.push(`/matches/${m.challenge.id}`)
    },
    onError: (err) => {
      idempotencyKey.current = crypto.randomUUID()
      if (isApiError(err, 'INSUFFICIENT_BALANCE')) queryClient.invalidateQueries({ queryKey: qk.wallet })
      const field = err instanceof ApiError ? (SERVER_FIELD[err.field ?? ''] ?? SERVER_FIELD[err.code]) : undefined
      if (isApiError(err, 'NOT_FOUND'))
        form.setError('opponent', { type: 'server', message: 'No user with that username.' }, { shouldFocus: true })
      else if (field) form.setError(field, { type: 'server', message: errorMessage(err) }, { shouldFocus: true })
      else form.setError('root.server', { type: 'server', message: errorMessage(err) })
    },
  })

  return (
    <div className="mx-auto max-w-3xl">
      <Link href="/matches" className="mb-4 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-4" /> Matches
      </Link>
      <PageHeader
        title="Challenge someone"
        description="You both stake the same amount. Play, report the result, and the winner takes the pot."
      />

      <form onSubmit={form.handleSubmit((v) => create.mutate(v))} className="grid gap-6 lg:grid-cols-[1fr_300px]" noValidate>
        <div className="grid gap-5 rounded-xl border bg-card p-5">
          <FormError message={errors.root?.server?.message} />
          <Field label="Opponent" error={errors.opponent?.message} hint="Their Quest username.">
            {(p) => <Input {...p} placeholder="@username" autoComplete="off" {...form.register('opponent')} />}
          </Field>
          {validUsername && !errors.opponent && <OpponentPreview username={username} />}

          <Field label="Game" error={errors.title?.message}>
            {(p) => <Input {...p} placeholder="e.g. FIFA 26" {...form.register('title')} />}
          </Field>

          <Field label="Format" error={errors.best_of?.message}>
            {() => (
              <Controller
                control={form.control}
                name="best_of"
                render={({ field }) => (
                  <Choice
                    value={field.value}
                    onChange={field.onChange}
                    columns={3}
                    options={[
                      { value: '', label: 'Single game' },
                      ...BEST_OF_OPTIONS.filter((n) => n !== '1').map((n) => ({
                        value: n,
                        label: `Best of ${n}`,
                        description: `First to ${(Number(n) + 1) / 2}`,
                      })),
                    ]}
                  />
                )}
              />
            )}
          </Field>

          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Stake (each)" error={errors.stake_naira?.message} hint="Taken from your wallet now; your opponent matches it.">
              {(p) => <Input {...p} inputMode="decimal" placeholder="₦5,000" {...form.register('stake_naira')} />}
            </Field>
            <Field label="Play by" error={errors.deadline?.message} hint="Your opponent must accept before this.">
              {(p) => <Input {...p} type="datetime-local" min={minDeadlineLocal()} {...form.register('deadline')} />}
            </Field>
          </div>

          <Field label="House rules" optional error={errors.rules?.message}>
            {(p) => (
              <Textarea
                {...p}
                rows={3}
                placeholder="e.g. 6-minute halves, no extra time, record the final score screen"
                {...form.register('rules')}
              />
            )}
          </Field>
        </div>

        <aside className="grid h-fit gap-4 rounded-xl border bg-card p-5">
          <h2 className="font-medium">The pot</h2>
          <div className="grid gap-2">
            <PriceRow label="You stake" value={stakeKobo ? formatNaira(stakeKobo) : '—'} />
            <PriceRow label="They stake" value={stakeKobo ? formatNaira(stakeKobo) : '—'} />
            <PriceRow label="Platform fee" value={fee ? formatNaira(2 * fee) : '—'} />
            <PriceRow
              label={<span className="font-medium text-foreground">Winner takes</span>}
              className="border-t pt-2"
              value={<span className="text-base font-semibold text-primary">{takes ? formatNaira(takes) : '—'}</span>}
            />
          </div>
          <PriceRow
            label="Available balance"
            value={funds.wallet.isPending ? <Loader2 className="size-4 animate-spin" /> : formatNaira(funds.available)}
          />
          <p className="text-xs text-muted-foreground">
            Your stake is held in escrow. If they decline or don&apos;t accept in time, you get it all back.
          </p>
          {stakeKobo > 0 && !funds.wallet.isPending && !funds.enough ? (
            <>
              <ShortfallNotice shortfall={funds.shortfall} />
              <TopUpButton
                shortfall={funds.shortfall}
                available={funds.available}
                returnTo={pathname}
                beforeRedirect={() => writeJSON(DRAFT_KEY, form.getValues())}
              />
            </>
          ) : (
            <Button type="submit" disabled={create.isPending}>
              {create.isPending ? <Loader2 className="animate-spin" /> : <Swords />}
              {stakeKobo ? `Stake ${formatNaira(stakeKobo)} & send` : 'Send challenge'}
            </Button>
          )}
          <Link href="/matches" className={buttonVariants({ variant: 'ghost', className: 'text-muted-foreground' })}>
            Cancel
          </Link>
        </aside>
      </form>
    </div>
  )
}
