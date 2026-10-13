'use client'

import { useState } from 'react'
import { CreditCard, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import { errorMessage } from '@/lib/api/errors'
import { MIN_TOPUP_KOBO, startDeposit, topUpAmount } from '@/lib/deposit'
import { useWallet } from '@/hooks/queries'
import { FormError } from '@/components/common'
import { Button } from '@/components/ui/button'

/** Whether the wallet covers a stake, and by how much it falls short. */
export function useStakeFunds(stakeKobo: number) {
  const wallet = useWallet()
  const available = wallet.data?.available ?? 0
  const shortfall = Math.max(0, stakeKobo - available)
  return { wallet, available, shortfall, enough: wallet.data != null && shortfall === 0 }
}

export function PriceRow({ label, value, className }: { label: React.ReactNode; value: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex items-center justify-between gap-4 text-sm', className)}>
      <span className="text-muted-foreground">{label}</span>
      <span className="money text-right">{value}</span>
    </div>
  )
}

export function ShortfallNotice({ shortfall }: { shortfall: number }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm">
      You need <span className="money font-medium text-foreground">{formatNaira(shortfall)}</span> more to stake.
      {topUpAmount(shortfall) !== shortfall && (
        <span className="block text-xs text-muted-foreground">
          Top-ups start at {formatNaira(MIN_TOPUP_KOBO)}; any extra stays in your wallet.
        </span>
      )}
    </div>
  )
}

/**
 * Sends the user to Paystack for the shortfall. The deposit callback brings them back to `returnTo` once the
 * credit lands; `beforeRedirect` saves anything the page needs to pick up where it left off.
 */
export function TopUpButton({
  shortfall,
  available,
  returnTo,
  beforeRedirect,
  disabled,
  className,
}: {
  shortfall: number
  available: number
  returnTo: string
  beforeRedirect?: () => void
  disabled?: boolean
  className?: string
}) {
  const [redirecting, setRedirecting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function topUp() {
    setError(null)
    setRedirecting(true)
    beforeRedirect?.()
    try {
      await startDeposit({ amount: topUpAmount(shortfall), startAvailable: available, purpose: 'match', returnTo })
    } catch (err) {
      setRedirecting(false)
      setError(errorMessage(err))
    }
  }

  return (
    <>
      {error && <FormError message={error} />}
      <Button type="button" onClick={topUp} disabled={disabled || redirecting} className={className}>
        {redirecting ? <Loader2 className="animate-spin" /> : <CreditCard />} Top up {formatNaira(topUpAmount(shortfall))}
      </Button>
    </>
  )
}
