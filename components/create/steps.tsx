'use client'

import { useEffect } from 'react'
import { Controller, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { ArrowLeft, ArrowRight, Medal, Plus, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import { formatNaira, nairaToKobo, parseNaira, tierAmount } from '@/lib/money'
import {
  detailsSchema,
  rewardsSchema,
  settingsSchema,
  type DetailsValues,
  type RewardsInput,
  type RewardsValues,
  type SettingsValues,
} from '@/lib/schemas'
import { Field } from '@/components/common/field'
import { FormError, SUBMISSION_ICON } from '@/components/common'
import { RichTextEditor } from '@/components/common/rich-text-editor'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

export interface StepError {
  message: string
  field?: string
}

function StepNav({ onBack, nextLabel = 'Continue' }: { onBack?: () => void; nextLabel?: string }) {
  return (
    <div className="flex justify-between border-t pt-5">
      {onBack ? (
        <Button type="button" variant="ghost" onClick={onBack}>
          <ArrowLeft /> Back
        </Button>
      ) : (
        <span />
      )}
      <Button type="submit" className="h-9 px-4">
        {nextLabel} <ArrowRight />
      </Button>
    </div>
  )
}

/** Pushes a server error onto the right field (or root) when a step is re-opened because of it. */
function useServerError(
  error: StepError | undefined,
  setError: (name: never, e: { type: string; message: string }) => void,
  fields: readonly string[],
) {
  useEffect(() => {
    if (!error) return
    const name = error.field && fields.includes(error.field) ? error.field : 'root.server'
    setError(name as never, { type: 'server', message: error.message })
  }, [error, setError, fields])
}

// ---------------------------------------------------------------------------
// Step 1 — Details
// ---------------------------------------------------------------------------

const DETAIL_FIELDS = ['title', 'description', 'category', 'rules'] as const

export function StepDetails({
  defaults,
  error,
  onChange,
  onNext,
}: {
  defaults: Partial<DetailsValues>
  error?: StepError
  onChange: (v: Partial<DetailsValues>) => void
  onNext: (v: DetailsValues) => void
}) {
  const form = useForm<DetailsValues>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { title: '', description: '', rules: '', ...defaults } as DetailsValues,
  })
  const { errors } = form.formState
  useServerError(error, form.setError as never, DETAIL_FIELDS)

  useEffect(() => {
    const sub = form.watch((v) => onChange(v as Partial<DetailsValues>))
    return () => sub.unsubscribe()
  }, [form, onChange])

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="grid gap-5" noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label="Title" error={errors.title?.message}>
        {(p) => <Input {...p} placeholder="e.g. Best 30-second Afrobeats freestyle" {...form.register('title')} />}
      </Field>
      <Field label="Description" error={errors.description?.message}>
        {(p) => (
          <Controller
            control={form.control}
            name="description"
            render={({ field }) => (
              <RichTextEditor
                id={p.id}
                value={field.value}
                onChange={field.onChange}
                onBlur={field.onBlur}
                invalid={p['aria-invalid']}
              />
            )}
          />
        )}
      </Field>
      <Field label="Category" error={errors.category?.message}>
        {(p) => (
          <Controller
            control={form.control}
            name="category"
            render={({ field }) => (
              <Select value={field.value ?? null} onValueChange={(v) => field.onChange(v ?? undefined)}>
                <SelectTrigger id={p.id} aria-invalid={p['aria-invalid']} className="h-9 w-full sm:w-64">
                  <SelectValue placeholder="Choose a category" />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
        )}
      </Field>
      <Field label="Rules" optional error={errors.rules?.message} hint="Anything entrants must follow to qualify.">
        {(p) => <Textarea {...p} rows={4} {...form.register('rules')} />}
      </Field>
      <StepNav />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 2 — Settings
// ---------------------------------------------------------------------------

const SETTINGS_FIELDS = ['submission_type', 'challenge_type', 'winner_selection', 'max_participants', 'deadline'] as const

function Choice<T extends string>({
  value,
  onChange,
  options,
  columns = 2,
}: {
  value: T
  onChange: (v: T) => void
  options: { value: T; label: string; description?: string; icon?: React.ComponentType<{ className?: string }> }[]
  columns?: 2 | 3 | 4
}) {
  return (
    <div
      role="radiogroup"
      className={cn('grid gap-2', columns === 4 ? 'grid-cols-2 sm:grid-cols-4' : columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2')}
    >
      {options.map((o) => {
        const active = o.value === value
        const Icon = o.icon
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex flex-col items-start gap-1 rounded-lg border bg-background/50 p-3 text-left transition-colors hover:border-foreground/30',
              active && 'border-primary bg-primary/5',
            )}
          >
            <span className="flex items-center gap-2 text-sm font-medium">
              {Icon && <Icon className={cn('size-4', active ? 'text-primary' : 'text-muted-foreground')} />}
              {o.label}
            </span>
            {o.description && <span className="text-xs text-muted-foreground">{o.description}</span>}
          </button>
        )
      })}
    </div>
  )
}

function minDeadlineLocal() {
  const d = new Date(Date.now() + 61 * 60 * 1000)
  d.setSeconds(0, 0)
  const off = d.getTimezoneOffset() * 60_000
  return new Date(d.getTime() - off).toISOString().slice(0, 16)
}

export function StepSettings({
  defaults,
  error,
  onChange,
  onBack,
  onNext,
}: {
  defaults: Partial<SettingsValues>
  error?: StepError
  onChange: (v: Partial<SettingsValues>) => void
  onBack: () => void
  onNext: (v: SettingsValues) => void
}) {
  const form = useForm<SettingsValues>({
    resolver: zodResolver(settingsSchema),
    defaultValues: defaults as SettingsValues,
  })
  const { errors } = form.formState
  useServerError(error, form.setError as never, SETTINGS_FIELDS)

  useEffect(() => {
    const sub = form.watch((v) => onChange(v as Partial<SettingsValues>))
    return () => sub.unsubscribe()
  }, [form, onChange])

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="grid gap-6" noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label="Submission type" error={errors.submission_type?.message}>
        {() => (
          <Controller
            control={form.control}
            name="submission_type"
            render={({ field }) => (
              <Choice
                columns={4}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'video', label: 'Video', icon: SUBMISSION_ICON.video },
                  { value: 'image', label: 'Image', icon: SUBMISSION_ICON.image },
                  { value: 'audio', label: 'Audio', icon: SUBMISSION_ICON.audio },
                  { value: 'written', label: 'Written', icon: SUBMISSION_ICON.written },
                ]}
              />
            )}
          />
        )}
      </Field>
      <Field label="Who can enter" error={errors.challenge_type?.message}>
        {() => (
          <Controller
            control={form.control}
            name="challenge_type"
            render={({ field }) => (
              <Choice
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'public', label: 'Public', description: 'Anyone can join.' },
                  { value: 'direct', label: 'Invite only', description: 'Only people you invite.' },
                ]}
              />
            )}
          />
        )}
      </Field>
      <Field label="How winners are chosen" error={errors.winner_selection?.message}>
        {() => (
          <Controller
            control={form.control}
            name="winner_selection"
            render={({ field }) => (
              <Choice
                columns={3}
                value={field.value}
                onChange={field.onChange}
                options={[
                  { value: 'creator', label: 'You pick', description: 'You choose the winners.' },
                  { value: 'community', label: 'Community', description: 'Decided by votes.' },
                  { value: 'hybrid', label: 'Hybrid', description: 'Votes + your judgement.' },
                ]}
              />
            )}
          />
        )}
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Max participants" optional error={errors.max_participants?.message} hint="Leave empty for unlimited.">
          {(p) => <Input {...p} inputMode="numeric" placeholder="Unlimited" {...form.register('max_participants')} />}
        </Field>
        <Field label="Deadline" error={errors.deadline?.message} hint="At least 1 hour from now, in your local time.">
          {(p) => <Input {...p} type="datetime-local" min={minDeadlineLocal()} {...form.register('deadline')} />}
        </Field>
      </div>
      <StepNav onBack={onBack} />
    </form>
  )
}

// ---------------------------------------------------------------------------
// Step 3 — Rewards
// ---------------------------------------------------------------------------

export function StepRewards({
  defaults,
  error,
  onChange,
  onBack,
  onNext,
}: {
  defaults: Partial<RewardsInput>
  error?: StepError
  onChange: (v: Partial<RewardsInput>) => void
  onBack: () => void
  onNext: (v: RewardsValues) => void
}) {
  const form = useForm<RewardsInput, unknown, RewardsValues>({
    resolver: zodResolver(rewardsSchema),
    defaultValues: { pool_naira: '', tiers: [{ rank: 1, percentage: 100 }], ...defaults },
  })
  const { errors } = form.formState
  const tiers = useFieldArray({ control: form.control, name: 'tiers' })
  const pool = useWatch({ control: form.control, name: 'pool_naira' })
  const watched = useWatch({ control: form.control, name: 'tiers' })
  useServerError(error, form.setError as never, ['pool_naira', 'tiers'])

  useEffect(() => {
    const sub = form.watch((v) => onChange(v as Partial<RewardsInput>))
    return () => sub.unsubscribe()
  }, [form, onChange])

  const poolNaira = parseNaira(pool)
  const poolKobo = poolNaira > 0 ? nairaToKobo(poolNaira) : 0
  const sum = (watched ?? []).reduce((a, t) => a + (Number(t?.percentage) || 0), 0)
  const tiersError = (errors.tiers as { message?: string; root?: { message?: string } } | undefined)
  const tiersMessage = tiersError?.root?.message ?? tiersError?.message

  function addTier() {
    const nextRank = Math.max(0, ...(watched ?? []).map((t) => Number(t?.rank) || 0)) + 1
    tiers.append({ rank: nextRank, percentage: Math.max(0, 100 - sum) || 1 })
  }

  return (
    <form onSubmit={form.handleSubmit(onNext)} className="grid gap-6" noValidate>
      <FormError message={errors.root?.server?.message} />
      <Field label="Reward pool" error={errors.pool_naira?.message} hint="The total prize money shared among winners.">
        {(p) => (
          <div className="relative sm:w-72">
            <span className="money pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">₦</span>
            <Input
              {...p}
              inputMode="decimal"
              placeholder="50,000"
              className="money h-11 pl-7 text-lg"
              {...form.register('pool_naira')}
            />
          </div>
        )}
      </Field>

      <div className="grid gap-3">
        <div className="flex items-end justify-between">
          <div>
            <p className="text-sm font-medium">Reward tiers</p>
            <p className="text-xs text-muted-foreground">Split the pool between ranks. Must total 100%.</p>
          </div>
          <span className={cn('money text-sm', sum === 100 ? 'text-success' : 'text-destructive')}>{sum}% / 100%</span>
        </div>

        <div className="grid gap-2">
          {tiers.fields.map((f, i) => {
            const pct = Number(watched?.[i]?.percentage) || 0
            const rowErr = errors.tiers?.[i]
            return (
              <div key={f.id} className="grid grid-cols-[auto_1fr_1fr_auto] items-start gap-2 rounded-lg border bg-background/50 p-2 sm:grid-cols-[auto_6rem_6rem_1fr_auto] sm:items-center">
                <Medal className="mt-2 size-4 text-muted-foreground sm:mt-0" />
                <div>
                  <div className="relative">
                    <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-xs text-muted-foreground">#</span>
                    <Input aria-label="Rank" inputMode="numeric" className="money pl-6" aria-invalid={!!rowErr?.rank} {...form.register(`tiers.${i}.rank`)} />
                  </div>
                  {rowErr?.rank && <p className="mt-1 text-xs text-destructive">{rowErr.rank.message}</p>}
                </div>
                <div>
                  <div className="relative">
                    <Input aria-label="Percentage" inputMode="numeric" className="money pr-6" aria-invalid={!!rowErr?.percentage} {...form.register(`tiers.${i}.percentage`)} />
                    <span className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-xs text-muted-foreground">%</span>
                  </div>
                  {rowErr?.percentage && <p className="mt-1 text-xs text-destructive">{rowErr.percentage.message}</p>}
                </div>
                <p className="money col-span-3 col-start-2 text-sm text-primary sm:col-span-1 sm:col-start-auto sm:text-right">
                  Rank {watched?.[i]?.rank || '?'} = {formatNaira(tierAmount(poolKobo, pct))}
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label="Remove tier"
                  className="row-start-1 text-muted-foreground sm:row-start-auto"
                  disabled={tiers.fields.length === 1}
                  onClick={() => tiers.remove(i)}
                  style={{ gridColumnStart: 'auto' }}
                >
                  <Trash2 />
                </Button>
              </div>
            )
          })}
        </div>
        {tiersMessage && <p className="text-xs text-destructive">{tiersMessage}</p>}
        <Button type="button" variant="outline" className="w-fit" onClick={addTier} disabled={tiers.fields.length >= 20}>
          <Plus /> Add tier
        </Button>
      </div>
      <StepNav onBack={onBack} nextLabel="Review" />
    </form>
  )
}
