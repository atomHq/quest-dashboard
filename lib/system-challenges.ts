import { challengesApi } from '@/lib/api/endpoints'
import type { MediaType, SubmissionType, SystemChallengeItem } from '@/lib/api/types'

/** A challenge run by the Quest team, shown in the home page's featured section with media. */
export interface SystemChallenge {
  id: string
  challenge_id: string
  title: string
  category: string
  summary: string
  submission_type: SubmissionType
  /** The cover: the challenge's first media item, if it has any. */
  media: { type: MediaType; url: string | null; poster: string | null }
  /** KOBO. Grows with each entry on paid challenges. */
  reward_pool_amount: number
  /** KOBO; null when free to enter. */
  entry_price: number | null
  participants_count: number
  max_participants: number | null
  deadline: string
}

/** Strips editor HTML so descriptions read as a plain summary. */
function plain(text: string) {
  return text.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function toSystemChallenge({ challenge: c, media }: SystemChallengeItem): SystemChallenge {
  const cover = [...media].sort((a, b) => a.position - b.position)[0]
  return {
    id: c.id,
    challenge_id: c.id,
    title: c.title,
    category: c.category,
    summary: plain(c.description),
    submission_type: c.submission_type,
    media: cover ? { type: cover.media_type, url: cover.url, poster: null } : { type: 'image', url: null, poster: null },
    reward_pool_amount: c.reward_pool_amount,
    entry_price: c.funding_type === 'entry_funded' ? c.entry_price : null,
    participants_count: c.participants_count,
    max_participants: c.max_participants,
    deadline: c.deadline,
  }
}

export async function fetchSystemChallenges(): Promise<SystemChallenge[]> {
  const items = await challengesApi.system({ status: 'active', per_page: 10 })
  return items.map(toSystemChallenge)
}
