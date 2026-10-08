'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, PartyPopper } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import { challengesApi } from '@/lib/api/endpoints'
import { ApiError, errorMessage } from '@/lib/api/errors'
import type { ChallengeDetail } from '@/lib/api/types'
import { clearPendingDeposit } from '@/lib/deposit'
import { EMPTY_DRAFT, clearDraft, loadDraft, saveDraft, toCreateInput, type CreateDraft, type Step } from '@/lib/create-draft'
import type { DetailsValues, RewardsInput, SettingsValues } from '@/lib/schemas'
import { qk } from '@/hooks/queries'
import { PageHeader } from '@/components/common'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { StepDetails, StepRewards, StepSettings, type StepError } from './steps'
import { StepReview } from './step-review'

const STEPS: { n: Step; label: string }[] = [
  { n: 1, label: 'Details' },
  { n: 2, label: 'Settings' },
  { n: 3, label: 'Rewards' },
  { n: 4, label: 'Review & fund' },
]

const STEP_FOR_CODE: Record<string, Step> = {
  DEADLINE_IN_PAST: 2,
  DEADLINE_TOO_SOON: 2,
  INVALID_PERCENTAGES: 3,
  DUPLICATE_RANK: 3,
  NO_REWARD_TIERS: 3,
}

const STEP_FOR_FIELD: Record<string, { step: Step; field: string }> = {
  title: { step: 1, field: 'title' },
  description: { step: 1, field: 'description' },
  category: { step: 1, field: 'category' },
  rules: { step: 1, field: 'rules' },
  submission_type: { step: 2, field: 'submission_type' },
  challenge_type: { step: 2, field: 'challenge_type' },
  winner_selection: { step: 2, field: 'winner_selection' },
  max_participants: { step: 2, field: 'max_participants' },
  deadline: { step: 2, field: 'deadline' },
  reward_pool_amount: { step: 3, field: 'pool_naira' },
  reward_tiers: { step: 3, field: 'tiers' },
}

function Stepper({ step, maxReached, onJump }: { step: Step; maxReached: Step; onJump: (s: Step) => void }) {
  return (
    <ol className="mb-8 grid grid-cols-4 gap-2">
      {STEPS.map(({ n, label }) => {
        const done = n < step
        const active = n === step
        const reachable = n <= maxReached
        return (
          <li key={n}>
            <button
              type="button"
              disabled={!reachable}
              onClick={() => onJump(n)}
              className="group flex w-full flex-col gap-2 text-left disabled:cursor-not-allowed"
            >
              <span className={cn('h-1 rounded-full bg-border transition-colors', (done || active) && 'bg-primary')} />
              <span className={cn('flex items-center gap-1.5 text-xs', active ? 'text-foreground' : 'text-muted-foreground')}>
                {done ? <Check className="size-3 text-primary" /> : <span className="money">{n}.</span>}
                <span className="hidden sm:inline">{label}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ol>
  )
}

function Success({ detail }: { detail: ChallengeDetail }) {
  const c = detail.challenge
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center"
    >
      <motion.span
        initial={{ rotate: -20, scale: 0.4 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className="grid size-16 place-items-center rounded-full bg-primary/15 text-primary"
      >
        <PartyPopper className="size-8" />
      </motion.span>
      <h2 className="text-2xl font-semibold">Your challenge is live</h2>
      <p className="text-muted-foreground">
        <span className="money text-primary">{formatNaira(detail.escrow_summary.total_charge_amount)}</span> is now held in
        escrow for “{c.title}”.
      </p>
      <div className="flex gap-2">
        <Link href={`/dashboard/challenges/${c.id}`} className={buttonVariants()}>
          Manage challenge
        </Link>
        <Link href={`/challenges/${c.id}`} className={buttonVariants({ variant: 'outline' })}>
          View public page
        </Link>
      </div>
    </motion.div>
  )
}

export function CreateChallengeWizard() {
  const router = useRouter()
  const search = useSearchParams()
  const queryClient = useQueryClient()
  const [draft, setDraft] = useState<CreateDraft | null>(null)
  const [maxReached, setMaxReached] = useState<Step>(1)
  const [stepErrors, setStepErrors] = useState<Partial<Record<Step, StepError>>>({})
  const [created, setCreated] = useState<ChallengeDetail | null>(null)
  const [direction, setDirection] = useState(1)

  // Restore the draft (it survives the Paystack round-trip in sessionStorage).
  useEffect(() => {
    const d = loadDraft() ?? EMPTY_DRAFT
    // ?step=4 is only honoured when returning from a top-up for this draft.
    const step: Step = search.get('step') === '4' && d.awaitingFunding ? 4 : d.step
    setDraft({ ...d, step })
    setMaxReached(Math.max(step, d.step) as Step)
    if (search.get('step')) router.replace('/dashboard/challenges/new', { scroll: false })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (draft) saveDraft(draft)
  }, [draft])

  const goTo = useCallback((step: Step) => {
    setDraft((d) => {
      if (!d) return d
      setDirection(step > d.step ? 1 : -1)
      return { ...d, step }
    })
    setMaxReached((m) => (step > m ? step : m))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }, [])

  const onDetails = useCallback((v: Partial<DetailsValues>) => setDraft((d) => d && { ...d, details: v }), [])
  const onSettings = useCallback((v: Partial<SettingsValues>) => setDraft((d) => d && { ...d, settings: v }), [])
  const onRewards = useCallback((v: Partial<RewardsInput>) => setDraft((d) => d && { ...d, rewards: v }), [])

  const create = useMutation({
    mutationFn: () => challengesApi.create(toCreateInput(draft!)),
    onSuccess: (detail) => {
      clearDraft()
      clearPendingDeposit()
      setCreated(detail)
      queryClient.invalidateQueries({ queryKey: qk.wallet })
      queryClient.invalidateQueries({ queryKey: qk.myChallenges })
      queryClient.invalidateQueries({ queryKey: ['challenges'] })
    },
    onError: (err) => {
      if (!(err instanceof ApiError)) return
      if (err.code === 'INSUFFICIENT_BALANCE') {
        queryClient.invalidateQueries({ queryKey: qk.wallet })
        return
      }
      const byCode = STEP_FOR_CODE[err.code]
      const byField = err.field ? STEP_FOR_FIELD[err.field] : undefined
      const step = byCode ?? byField?.step
      if (step) {
        setStepErrors({ [step]: { message: errorMessage(err), field: byField?.field ?? (step === 2 ? 'deadline' : 'tiers') } })
        goTo(step)
      }
    },
  })

  if (created) return <Success detail={created} />
  if (!draft)
    return (
      <div className="mx-auto max-w-2xl space-y-4">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-2 w-full" />
        <Skeleton className="h-96 w-full rounded-xl" />
      </div>
    )

  const reviewError =
    create.error && !(create.error instanceof ApiError && (STEP_FOR_CODE[create.error.code] || create.error.field))
      ? errorMessage(create.error)
      : undefined

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="New challenge" description="Set it up, fund the escrow, and go live instantly." />
      <Stepper step={draft.step} maxReached={maxReached} onJump={goTo} />
      <div className="rounded-xl border bg-card p-5 sm:p-6">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          <motion.div
            key={draft.step}
            custom={direction}
            initial={{ opacity: 0, x: 16 * direction }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -16 * direction }}
            transition={{ duration: 0.18 }}
          >
            {draft.step === 1 && (
              <StepDetails
                defaults={draft.details}
                error={stepErrors[1]}
                onChange={onDetails}
                onNext={(v) => {
                  setDraft((d) => d && { ...d, details: v })
                  setStepErrors((e) => ({ ...e, 1: undefined }))
                  goTo(2)
                }}
              />
            )}
            {draft.step === 2 && (
              <StepSettings
                defaults={draft.settings}
                error={stepErrors[2]}
                onChange={onSettings}
                onBack={() => goTo(1)}
                onNext={(v) => {
                  setDraft((d) => d && { ...d, settings: v })
                  setStepErrors((e) => ({ ...e, 2: undefined }))
                  goTo(3)
                }}
              />
            )}
            {draft.step === 3 && (
              <StepRewards
                defaults={draft.rewards}
                error={stepErrors[3]}
                onChange={onRewards}
                onBack={() => goTo(2)}
                onNext={() => {
                  setStepErrors((e) => ({ ...e, 3: undefined }))
                  goTo(4)
                }}
              />
            )}
            {draft.step === 4 && (
              <StepReview
                draft={draft}
                error={reviewError}
                creating={create.isPending}
                onEdit={goTo}
                onBack={() => goTo(3)}
                onCreate={() => {
                  setStepErrors({})
                  create.mutate()
                }}
                onTopUpStart={(awaiting) => {
                  const next = { ...draft, step: 4 as Step, awaitingFunding: awaiting }
                  saveDraft(next) // synchronously, before navigating away
                  setDraft(next)
                }}
              />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {draft.step > 1 && (
        <div className="mt-4 text-center">
          <Button
            variant="link"
            className="text-xs text-muted-foreground"
            onClick={() => {
              clearDraft()
              setDraft({ ...EMPTY_DRAFT })
              setMaxReached(1)
              setStepErrors({})
            }}
          >
            Discard draft and start over
          </Button>
        </div>
      )}
    </div>
  )
}
