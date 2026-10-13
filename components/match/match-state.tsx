'use client'

import { cn } from '@/lib/utils'
import type { HeadToHeadState, MatchListItem, MatchPlayer, MatchView } from '@/lib/api/types'
import { Badge } from '@/components/ui/badge'
import { InitialsAvatar } from '@/components/common'

const STATE_LABEL: Record<HeadToHeadState, string> = {
  awaiting_opponent: 'Awaiting opponent',
  in_play: 'In play',
  disputed: 'Disputed',
  settling: 'Paying out',
  settled: 'Settled',
  refunded: 'Refunded',
}

const STATE_STYLE: Record<HeadToHeadState, string> = {
  awaiting_opponent: 'bg-primary/15 text-primary',
  in_play: 'bg-success/15 text-success',
  disputed: 'bg-destructive/15 text-destructive',
  settling: 'bg-blue-500/15 text-blue-400',
  settled: 'bg-foreground/10 text-foreground',
  refunded: 'bg-muted text-muted-foreground',
}

/** Matches still waiting on someone — they stay on the dashboard until they settle or refund. */
export const OPEN_MATCH_STATES: HeadToHeadState[] = ['awaiting_opponent', 'in_play', 'disputed', 'settling']

export function MatchStateBadge({ state, className }: { state: HeadToHeadState; className?: string }) {
  return (
    <Badge className={cn('border-0', STATE_STYLE[state], className)}>
      {state === 'in_play' && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
      {STATE_LABEL[state]}
    </Badge>
  )
}

type MatchLike = Pick<MatchView | MatchListItem, 'head_to_head' | 'creator' | 'opponent' | 'my_role'>

/** The viewer and the other player; an admin sees the creator as "me". */
export function sides(m: MatchLike): { me: MatchPlayer; them: MatchPlayer } {
  return m.my_role === 'opponent' ? { me: m.opponent, them: m.creator } : { me: m.creator, them: m.opponent }
}

/** One line describing where the match stands, from the viewer's side. */
export function matchHeadline(m: MatchLike): string {
  const h = m.head_to_head
  const { them } = sides(m)
  const admin = m.my_role === 'admin'
  switch (h.state) {
    case 'awaiting_opponent':
      if (admin) return `Waiting for @${m.opponent.username} to accept`
      return m.my_role === 'opponent' ? `@${them.username} challenged you` : `Waiting for @${them.username} to accept`
    case 'in_play':
      return 'Match on — report the result when you finish'
    case 'disputed':
      return 'Results disagree — an admin will decide'
    case 'settling':
      return 'Paying the winner'
    case 'settled': {
      if (admin || !h.winner_id) return 'Settled'
      return h.winner_id === sides(m).me.id ? 'You won' : `@${them.username} won`
    }
    case 'refunded':
      return 'Stakes refunded'
  }
}

export function PlayerChip({ player, label, className }: { player: MatchPlayer; label?: string; className?: string }) {
  return (
    <span className={cn('inline-flex min-w-0 items-center gap-2', className)}>
      <InitialsAvatar name={player.username} src={player.avatar_url} className="size-7 text-[10px]" />
      <span className="truncate text-sm">{label ?? `@${player.username}`}</span>
    </span>
  )
}
