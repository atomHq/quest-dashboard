'use client'

import Link from 'next/link'
import { motion } from 'framer-motion'
import { Clock, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import { formatDeadline } from '@/lib/time'
import { SUBMISSION_TYPE_LABEL } from '@/lib/constants'
import type { Challenge } from '@/lib/api/types'
import { useNow } from '@/hooks/use-now'
import { StatusBadge, SubmissionTypeIcon } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'

export function Countdown({ deadline, className }: { deadline: string; className?: string }) {
  const now = useNow(30_000)
  const text = formatDeadline(deadline, now)
  const closed = text === 'Closed'
  return <span className={cn(closed ? 'text-muted-foreground' : 'text-foreground', className)}>{text}</span>
}

export function ParticipantsCount({ c }: { c: Pick<Challenge, 'participants_count' | 'max_participants'> }) {
  return (
    <span className="money">
      {c.participants_count}
      {c.max_participants != null && <span className="text-muted-foreground"> / {c.max_participants}</span>}
    </span>
  )
}

export function ChallengeCard({ c, index = 0 }: { c: Challenge; index?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay: Math.min(index, 8) * 0.03 }}
    >
      <Link
        href={`/challenges/${c.id}`}
        className="group flex h-full flex-col gap-4 rounded-xl border bg-card p-5 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[0_0_0_1px_rgba(245,197,24,0.15),0_12px_40px_-12px_rgba(245,197,24,0.15)]"
      >
        <div className="flex items-center justify-between gap-2">
          <Badge variant="outline" className="font-normal">
            {c.category}
          </Badge>
          <div className="flex items-center gap-2">
            {c.status !== 'active' && <StatusBadge status={c.status} />}
            <span
              className="grid size-7 place-items-center rounded-md bg-muted text-muted-foreground"
              title={SUBMISSION_TYPE_LABEL[c.submission_type]}
            >
              <SubmissionTypeIcon type={c.submission_type} className="size-3.5" />
            </span>
          </div>
        </div>
        <h3 className="line-clamp-2 leading-snug font-medium group-hover:text-primary">{c.title}</h3>
        <div className="mt-auto space-y-3">
          <div>
            <p className="text-xs text-muted-foreground">Reward pool</p>
            <p className="money text-2xl font-semibold text-primary">{formatNaira(c.reward_pool_amount)}</p>
          </div>
          <div className="flex items-center justify-between border-t pt-3 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" />
              <Countdown deadline={c.deadline} />
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="size-3.5" />
              <ParticipantsCount c={c} />
            </span>
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

export function ChallengeCardSkeleton() {
  return (
    <div className="flex h-56 flex-col gap-4 rounded-xl border bg-card p-5">
      <div className="flex justify-between">
        <Skeleton className="h-5 w-16" />
        <Skeleton className="size-7" />
      </div>
      <Skeleton className="h-5 w-4/5" />
      <div className="mt-auto space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-7 w-28" />
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

export function ChallengeGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{children}</div>
}
