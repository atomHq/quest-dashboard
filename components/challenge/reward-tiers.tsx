import { Lock, Medal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import type { EscrowSummary, RewardTier } from '@/lib/api/types'

const RANK_STYLE = ['text-primary', 'text-zinc-300', 'text-amber-600']

export function RewardTiers({ tiers, className }: { tiers: RewardTier[]; className?: string }) {
  const sorted = [...tiers].sort((a, b) => a.rank - b.rank)
  return (
    <ul className={cn('grid gap-2', className)}>
      {sorted.map((t) => (
        <li key={t.id} className="flex items-center justify-between rounded-lg border bg-background/50 px-3 py-2.5">
          <span className="flex items-center gap-2 text-sm">
            <Medal className={cn('size-4', RANK_STYLE[t.rank - 1] ?? 'text-muted-foreground')} />
            Rank {t.rank}
            <span className="text-muted-foreground">· {t.percentage}%</span>
          </span>
          <span className="flex items-center gap-2">
            {t.paid_at && <span className="text-xs text-success">Paid</span>}
            <span className="money font-medium text-primary">{formatNaira(t.amount)}</span>
          </span>
        </li>
      ))}
    </ul>
  )
}

export function EscrowBadge({ summary, className }: { summary: EscrowSummary; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-success/30 bg-success/10 px-2.5 py-1 text-xs text-success',
        className,
      )}
    >
      <Lock className="size-3" />
      <span className="money">{formatNaira(summary.total_charge_amount)}</span> in escrow
    </span>
  )
}
