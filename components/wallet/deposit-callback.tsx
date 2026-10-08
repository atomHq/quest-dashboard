'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, Clock, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { formatNaira } from '@/lib/money'
import { clearPendingDeposit, getPendingDeposit, type PendingDeposit } from '@/lib/deposit'
import { draftTotalKobo, loadDraft, saveDraft, type CreateDraft } from '@/lib/create-draft'
import { qk, useWallet } from '@/hooks/queries'
import { Button, buttonVariants } from '@/components/ui/button'

const POLL_MS = 2_000
const TIMEOUT_MS = 60_000

type Phase = 'polling' | 'done' | 'timeout'

export function DepositCallback() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const search = useSearchParams()
  const reference = search.get('reference') ?? search.get('trxref')

  const [ctx, setCtx] = useState<{ pending: PendingDeposit | null; draft: CreateDraft | null } | null>(null)
  const [phase, setPhase] = useState<Phase>('polling')
  const [startedAt, setStartedAt] = useState(() => Date.now())
  const handled = useRef(false)

  useEffect(() => {
    const draft = loadDraft()
    setCtx({ pending: getPendingDeposit(), draft: draft?.awaitingFunding ? draft : null })
  }, [])

  const wallet = useWallet({ refetchInterval: phase === 'polling' ? POLL_MS : false })
  const available = wallet.data?.available

  // What balance counts as "the deposit has landed"?
  const target = !ctx
    ? null
    : ctx.draft
      ? draftTotalKobo(ctx.draft)
      : ctx.pending
        ? ctx.pending.startAvailable + 1
        : 0

  useEffect(() => {
    if (phase !== 'polling' || target === null || available === undefined || handled.current) return
    if (available >= target) {
      handled.current = true
      setPhase('done')
      clearPendingDeposit()
      queryClient.invalidateQueries({ queryKey: ['tx'] })
      queryClient.invalidateQueries({ queryKey: qk.earnings })
      if (ctx?.draft) {
        saveDraft({ ...ctx.draft, step: 4, awaitingFunding: undefined })
        toast.success('Wallet funded — you can create your challenge now.')
        setTimeout(() => router.replace('/dashboard/challenges/new?step=4'), 1200)
      }
    }
  }, [available, target, phase, ctx, queryClient, router])

  useEffect(() => {
    if (phase !== 'polling') return
    const t = setTimeout(() => setPhase((p) => (p === 'polling' ? 'timeout' : p)), TIMEOUT_MS - (Date.now() - startedAt))
    return () => clearTimeout(t)
  }, [phase, startedAt])

  const credited = ctx?.pending && available !== undefined ? Math.max(0, available - ctx.pending.startAvailable) : null

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
      {phase === 'polling' && (
        <>
          <span className="relative grid size-16 place-items-center">
            <span className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <Loader2 className="size-8 animate-spin text-primary" />
          </span>
          <h1 className="text-xl font-semibold">Confirming your payment…</h1>
          <p className="text-sm text-muted-foreground">
            This usually takes a few seconds. Please don&apos;t close this page.
          </p>
          {ctx?.pending && (
            <p className="money text-sm text-muted-foreground">Top-up: {formatNaira(ctx.pending.amount)}</p>
          )}
        </>
      )}

      {phase === 'done' && (
        <>
          <motion.span
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 300, damping: 16 }}
          >
            <CheckCircle2 className="size-16 text-success" />
          </motion.span>
          <h1 className="text-xl font-semibold">Payment received</h1>
          {credited !== null && credited > 0 && (
            <p className="text-muted-foreground">
              <span className="money text-2xl font-semibold text-primary">{formatNaira(credited)}</span>
              <br />
              added to your wallet
            </p>
          )}
          {available !== undefined && (
            <p className="text-sm text-muted-foreground">
              Available balance: <span className="money text-foreground">{formatNaira(available)}</span>
            </p>
          )}
          {ctx?.draft ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" /> Taking you back to your challenge…
            </p>
          ) : (
            <Link href="/wallet" className={buttonVariants({ className: 'mt-2' })}>
              Go to wallet
            </Link>
          )}
        </>
      )}

      {phase === 'timeout' && (
        <>
          <Clock className="size-14 text-primary" />
          <h1 className="text-xl font-semibold">Payment still processing</h1>
          <p className="text-sm text-muted-foreground">
            We&apos;ll update your balance shortly. If you completed the payment, it will show up in your wallet within a
            few minutes.
          </p>
          {reference && <p className="money text-xs text-muted-foreground">Ref: {reference}</p>}
          <div className="mt-2 flex flex-wrap justify-center gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setStartedAt(Date.now())
                setPhase('polling')
              }}
            >
              Check again
            </Button>
            {ctx?.draft ? (
              <Link href="/dashboard/challenges/new?step=4" className={buttonVariants()}>
                Back to my challenge
              </Link>
            ) : (
              <Link href="/wallet" className={buttonVariants()}>
                Go to wallet
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  )
}
