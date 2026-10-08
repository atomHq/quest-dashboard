'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowDownLeft,
  ArrowUpRight,
  CalendarRange,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  Hourglass,
  Loader2,
  Lock,
  Plus,
  Receipt,
  Wallet,
  X,
} from 'lucide-react'
import type { DateRange } from 'react-day-picker'
import type { z } from 'zod'
import { cn } from '@/lib/utils'
import { formatNaira, nairaToKobo } from '@/lib/money'
import { formatDateTime } from '@/lib/time'
import { errorMessage } from '@/lib/api/errors'
import type { WalletAccount } from '@/lib/api/types'
import { depositSchema } from '@/lib/schemas'
import { startDeposit } from '@/lib/deposit'
import { useEarnings, useTransactions, useWallet } from '@/hooks/queries'
import { EmptyState, ErrorState, FormError, PageHeader } from '@/components/common'
import { Field } from '@/components/common/field'
import { Button } from '@/components/ui/button'
import { Calendar } from '@/components/ui/calendar'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Skeleton } from '@/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Balance cards
// ---------------------------------------------------------------------------

function AnimatedMoney({ kobo, className }: { kobo: number; className?: string }) {
  return (
    <AnimatePresence mode="popLayout" initial={false}>
      <motion.span
        key={kobo}
        initial={{ y: 10, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: -10, opacity: 0 }}
        className={cn('money inline-block', className)}
      >
        {formatNaira(kobo)}
      </motion.span>
    </AnimatePresence>
  )
}

export function StatCard({
  label,
  icon: Icon,
  children,
  highlight,
  hint,
}: {
  label: string
  icon: React.ComponentType<{ className?: string }>
  children: React.ReactNode
  highlight?: boolean
  hint?: string
}) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-xl border bg-card p-5', highlight && 'border-primary/40 bg-gradient-to-br from-primary/10 to-card')}>
      <span className="flex items-center gap-2 text-xs tracking-wide text-muted-foreground uppercase">
        <Icon className={cn('size-3.5', highlight && 'text-primary')} /> {label}
      </span>
      <div className="text-2xl font-semibold">{children}</div>
      {hint && <p className="-mt-1 text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}

function BalanceCards() {
  const { data, isPending, isError, error, refetch } = useWallet()
  if (isPending)
    return (
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, i) => (
          <Skeleton key={i} className="h-[118px] rounded-xl" />
        ))}
      </div>
    )
  if (isError) return <ErrorState error={error} onRetry={() => refetch()} />
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard label="Available" icon={Wallet} highlight hint="Ready to fund challenges">
        <AnimatedMoney kobo={data.available} className="text-primary" />
      </StatCard>
      <StatCard label="In escrow" icon={Lock} hint="Locked in your live challenges">
        <AnimatedMoney kobo={data.escrow} />
      </StatCard>
      <StatCard label="Pending" icon={Hourglass} hint="Clearing payments and payouts">
        <AnimatedMoney kobo={data.pending} />
      </StatCard>
      <StatCard label="Total" icon={Receipt}>
        <AnimatedMoney kobo={data.total} />
      </StatCard>
    </div>
  )
}

function EarningsStrip() {
  const { data, isPending } = useEarnings()
  return (
    <div className="flex flex-wrap gap-x-8 gap-y-2 rounded-xl border bg-card/50 px-5 py-3 text-sm">
      <span className="flex items-center gap-2 text-muted-foreground">
        <ArrowDownLeft className="size-4 text-success" /> Total earned
        {isPending ? <Skeleton className="h-4 w-16" /> : <span className="money font-medium text-foreground">{formatNaira(data?.total_earned ?? 0)}</span>}
      </span>
      <span className="flex items-center gap-2 text-muted-foreground">
        <ArrowUpRight className="size-4 text-muted-foreground" /> Total withdrawn
        {isPending ? <Skeleton className="h-4 w-16" /> : <span className="money font-medium text-foreground">{formatNaira(data?.total_withdrawn ?? 0)}</span>}
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Dialogs
// ---------------------------------------------------------------------------

const QUICK_AMOUNTS = [5_000, 10_000, 50_000, 100_000]

function AddFundsDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const wallet = useWallet()
  const form = useForm<z.input<typeof depositSchema>, unknown, z.output<typeof depositSchema>>({
    resolver: zodResolver(depositSchema),
    defaultValues: { amount_naira: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ amount_naira }) => {
    try {
      await startDeposit({
        amount: nairaToKobo(amount_naira),
        startAvailable: wallet.data?.available ?? 0,
        purpose: 'wallet',
      })
      // Navigating away to Paystack — keep the spinner up.
      await new Promise(() => {})
    } catch (err) {
      form.setError('root.server', { message: errorMessage(err) })
    }
  })

  return (
    <Dialog open={open} onOpenChange={(o) => !isSubmitting && onOpenChange(o)}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <DialogHeader>
            <DialogTitle>Add funds</DialogTitle>
            <DialogDescription>You&apos;ll be redirected to Paystack to complete the payment.</DialogDescription>
          </DialogHeader>
          <FormError message={errors.root?.server?.message} />
          <Field label="Amount" error={errors.amount_naira?.message}>
            {(p) => (
              <div className="relative">
                <span className="money pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-muted-foreground">₦</span>
                <Input {...p} autoFocus inputMode="decimal" className="money h-11 pl-7 text-lg" placeholder="10,000" {...form.register('amount_naira')} />
              </div>
            )}
          </Field>
          <div className="flex flex-wrap gap-2">
            {QUICK_AMOUNTS.map((n) => (
              <button
                key={n}
                type="button"
                className="money rounded-full border px-3 py-1 text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
                onClick={() => form.setValue('amount_naira', String(n), { shouldValidate: true })}
              >
                {formatNaira(n * 100)}
              </button>
            ))}
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="animate-spin" /> : <CreditCard />} Continue to Paystack
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function WithdrawDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-sm">
        <div className="flex flex-col items-center gap-3 py-4 text-center">
          <span className="grid size-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Clock className="size-5" />
          </span>
          <DialogTitle>Withdrawals are coming soon</DialogTitle>
          <DialogDescription>
            We&apos;re finishing bank payouts. Your winnings are safe in your wallet in the meantime.
          </DialogDescription>
          <Button className="mt-2" onClick={() => onOpenChange(false)}>
            Got it
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ---------------------------------------------------------------------------
// Transactions
// ---------------------------------------------------------------------------

const ACCOUNTS: { value: WalletAccount | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'available', label: 'Available' },
  { value: 'escrow', label: 'Escrow' },
  { value: 'pending', label: 'Pending' },
]

const PER_PAGE = 20

function rangeLabel(r?: DateRange) {
  if (!r?.from) return 'Any date'
  const f = (d: Date) => d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short' })
  return r.to ? `${f(r.from)} – ${f(r.to)}` : `From ${f(r.from)}`
}

function TransactionsTable() {
  const [account, setAccount] = useState<WalletAccount | 'all'>('all')
  const [range, setRange] = useState<DateRange | undefined>()
  const [page, setPage] = useState(1)

  const from = range?.from ? new Date(new Date(range.from).setHours(0, 0, 0, 0)).toISOString() : undefined
  const to = range?.to ? new Date(new Date(range.to).setHours(23, 59, 59, 999)).toISOString() : undefined

  const q = useTransactions({ account: account === 'all' ? undefined : account, from, to, page, per_page: PER_PAGE })
  const rows = q.data?.data ?? []
  const meta = q.data?.meta

  return (
    <div className="rounded-xl border bg-card">
      <div className="flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="font-medium">Transactions</h2>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border bg-background p-0.5">
            {ACCOUNTS.map((a) => (
              <button
                key={a.value}
                type="button"
                aria-pressed={account === a.value}
                onClick={() => {
                  setAccount(a.value)
                  setPage(1)
                }}
                className={cn(
                  'h-7 rounded-md px-2.5 text-xs transition-colors',
                  account === a.value ? 'bg-accent text-foreground' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {a.label}
              </button>
            ))}
          </div>
          <Popover>
            <PopoverTrigger render={<Button variant="outline" size="sm" className="h-8" />}>
              <CalendarRange /> {rangeLabel(range)}
            </PopoverTrigger>
            <PopoverContent align="end" className="w-auto p-0">
              <Calendar
                mode="range"
                selected={range}
                onSelect={(r) => {
                  setRange(r)
                  setPage(1)
                }}
                numberOfMonths={1}
                disabled={{ after: new Date() }}
              />
            </PopoverContent>
          </Popover>
          {range && (
            <Button variant="ghost" size="icon-sm" aria-label="Clear dates" onClick={() => setRange(undefined)}>
              <X />
            </Button>
          )}
        </div>
      </div>

      {q.isPending ? (
        <div className="grid gap-2 p-4">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} className="m-4" />
      ) : rows.length === 0 ? (
        <EmptyState icon={Receipt} title="No transactions" description="Deposits, escrow moves and payouts will show up here." className="m-4 border-0" />
      ) : (
        <div className={cn('transition-opacity', q.isPlaceholderData && 'opacity-60')}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="pl-4">Transaction</TableHead>
                <TableHead>Account</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead className="pr-4 text-right">Amount</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((t) => {
                const credit = t.type === 'credit'
                return (
                  <TableRow key={t.id}>
                    <TableCell className="pl-4">
                      <div className="flex items-center gap-3">
                        <span
                          className={cn(
                            'grid size-8 shrink-0 place-items-center rounded-full',
                            credit ? 'bg-success/15 text-success' : 'bg-destructive/15 text-destructive',
                          )}
                        >
                          {credit ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />}
                        </span>
                        <div className="min-w-0">
                          <p className="max-w-[16rem] truncate text-sm">{t.narration || (credit ? 'Credit' : 'Debit')}</p>
                          <p className="money max-w-[16rem] truncate text-xs text-muted-foreground">{t.reference}</p>
                          <p className="text-xs text-muted-foreground md:hidden">{formatDateTime(t.created_at)}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground capitalize">{t.account}</TableCell>
                    <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{formatDateTime(t.created_at)}</TableCell>
                    <TableCell className="pr-4 text-right">
                      <p className={cn('money font-medium', credit ? 'text-success' : 'text-destructive')}>
                        {credit ? '+' : '−'}
                        {formatNaira(t.amount)}
                      </p>
                      <p className="money text-xs text-muted-foreground">Bal {formatNaira(t.balance_after)}</p>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
          {meta && meta.total_pages > 1 && (
            <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-muted-foreground">
              <span>
                Page <span className="money">{meta.page}</span> of <span className="money">{meta.total_pages}</span>
              </span>
              <div className="flex gap-1">
                <Button variant="outline" size="icon-sm" aria-label="Previous page" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                  <ChevronLeft />
                </Button>
                <Button
                  variant="outline"
                  size="icon-sm"
                  aria-label="Next page"
                  disabled={page >= meta.total_pages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  <ChevronRight />
                </Button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------

export function WalletView() {
  const [addOpen, setAddOpen] = useState(false)
  const [withdrawOpen, setWithdrawOpen] = useState(false)
  return (
    <div className="space-y-6">
      <PageHeader
        title="Wallet"
        description="Fund challenges, track escrow, and see your winnings."
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setWithdrawOpen(true)}>
              <ArrowUpRight /> Withdraw
            </Button>
            <Button onClick={() => setAddOpen(true)}>
              <Plus /> Add funds
            </Button>
          </div>
        }
      />
      <BalanceCards />
      <EarningsStrip />
      <TransactionsTable />
      <AddFundsDialog open={addOpen} onOpenChange={setAddOpen} />
      <WithdrawDialog open={withdrawOpen} onOpenChange={setWithdrawOpen} />
    </div>
  )
}
