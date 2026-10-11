import type { SubmissionType } from '@/lib/api/types'

/**
 * A challenge run by the Quest team, shown in the featured section of the home page with media.
 * PLACEHOLDER: there is no backend endpoint yet. When it exists, point `fetchSystemChallenges`
 * at it and drop SYSTEM_CHALLENGES_PLACEHOLDER; the UI only depends on this shape.
 */
export interface SystemChallenge {
  id: string
  /** The real challenge to open, once system challenges are backed by the API. */
  challenge_id: string | null
  title: string
  category: string
  summary: string
  submission_type: SubmissionType
  media: { type: 'image' | 'video'; url: string | null; poster: string | null }
  /** KOBO. */
  reward_pool_amount: number
  /** KOBO; null when free to enter. */
  entry_price: number | null
  participants_count: number
  max_participants: number | null
  deadline: string
}

const inDays = (d: number) => new Date(Date.now() + d * 86_400_000).toISOString()

function placeholder(): SystemChallenge[] {
  return [
    {
      id: 'sys-1',
      challenge_id: null,
      title: 'Quest Dance Cup: Afrobeats Edition',
      category: 'Dance',
      summary: 'Post your best 60-second routine to the official track. Judged on energy, originality and timing.',
      submission_type: 'video',
      media: { type: 'video', url: null, poster: '/system/dance.svg' },
      reward_pool_amount: 50_000_000,
      entry_price: null,
      participants_count: 342,
      max_participants: null,
      deadline: inDays(12),
    },
    {
      id: 'sys-2',
      challenge_id: null,
      title: 'Lagos Street Photography',
      category: 'Art',
      summary: 'One photo that captures Lagos life. Original shots only, taken in the last 30 days, no watermarks.',
      submission_type: 'image',
      media: { type: 'image', url: '/system/photo.svg', poster: null },
      reward_pool_amount: 15_000_000,
      entry_price: null,
      participants_count: 128,
      max_participants: 500,
      deadline: inDays(10),
    },
    {
      id: 'sys-3',
      challenge_id: null,
      title: 'Stand-up Minute',
      category: 'Comedy',
      summary: 'Make us laugh in under a minute. Top three clips split the pot, and the winner opens our live show.',
      submission_type: 'video',
      media: { type: 'video', url: null, poster: '/system/comedy.svg' },
      reward_pool_amount: 25_000_000,
      entry_price: 100_000,
      participants_count: 87,
      max_participants: 200,
      deadline: inDays(6),
    },
    {
      id: 'sys-4',
      challenge_id: null,
      title: 'Naija Jollof Showdown',
      category: 'Food',
      summary: 'Cook your signature jollof and show us the plate. Presentation and recipe story both count.',
      submission_type: 'image',
      media: { type: 'image', url: '/system/food.svg', poster: null },
      reward_pool_amount: 10_000_000,
      entry_price: null,
      participants_count: 64,
      max_participants: null,
      deadline: inDays(18),
    },
  ]
}

export async function fetchSystemChallenges(): Promise<SystemChallenge[]> {
  // TODO: replace with the dedicated endpoint, e.g. api.get<SystemChallenge[]>('/challenges/system', { auth: false }).
  return placeholder()
}
