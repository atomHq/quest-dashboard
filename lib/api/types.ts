// Shared API types. Mirrors the quest-backend contract — all money fields are KOBO integers.

export type ChallengeStatus = 'draft' | 'active' | 'closed' | 'judging' | 'completed' | 'cancelled'
export type SubmissionType = 'video' | 'audio' | 'image' | 'written'
export type ChallengeType = 'public' | 'direct'
export type WinnerSelection = 'creator' | 'community' | 'hybrid'

export interface Challenge {
  id: string
  creator_id: string
  title: string
  description: string
  category: string
  rules: string | null
  status: ChallengeStatus
  challenge_type: ChallengeType
  submission_type: SubmissionType
  winner_selection: WinnerSelection
  currency: string
  reward_pool_amount: number
  platform_fee_amount: number
  total_funded_amount: number
  max_participants: number | null
  participants_count: number
  deadline: string
  activated_at: string | null
  completed_at: string | null
  created_at: string
  updated_at: string
}

export interface RewardTier {
  id: string
  challenge_id: string
  rank: number
  percentage: number
  amount: number
  winner_user_id: string | null
  status: string
  paid_at: string | null
  created_at: string
}

export interface EscrowSummary {
  reward_pool_amount: number
  platform_fee_amount: number
  total_charge_amount: number
  fee_percentage: number
}

export interface ChallengeDetail {
  challenge: Challenge
  reward_tiers: RewardTier[]
  escrow_summary: EscrowSummary
}

export interface Profile {
  id: string
  username: string
  email: string
  first_name?: string
  last_name?: string
  bio?: string
  avatar_url?: string
  cover_url?: string
  role: string
  verification_status: string
  followers_count: number
  following_count: number
  total_challenges_created: number
  total_challenges_won: number
  total_earnings_kobo: number
  created_at: string
  updated_at: string
}

export interface TokenPair {
  access_token: string
  refresh_token: string
  token_type: string
  access_expires_at: string
  refresh_expires_at: string
  user: Profile
}

/** What our /api/session/* route handlers return — the refresh token stays in an httpOnly cookie. */
export type ClientSession = Omit<TokenPair, 'refresh_token'>

export interface Submission {
  id: string
  challenge_id: string
  user_id: string
  status: 'pending' | 'approved' | 'rejected' | 'winner' | 'disqualified'
  caption: string | null
  like_count: number
  view_count: number
  vote_count: number
  rank: number | null
  score: number | null
  created_at: string
  updated_at: string
}

export interface SubmissionMedia {
  id: string
  submission_id: string
  media_type: 'video' | 'audio' | 'image'
  r2_key: string
  cdn_url: string | null
  thumbnail_key: string | null
  duration_seconds: number | null
  size_bytes: number | null
  processing_status: string
  created_at: string
}

export interface SubmissionWithMedia {
  submission: Submission
  media: SubmissionMedia[]
}

export interface Participant {
  id: string
  challenge_id: string
  user_id: string
  status: 'joined' | 'submitted' | 'disqualified' | 'withdrawn'
  invite_id: string | null
  joined_at: string
  updated_at: string
  username: string
  avatar_key: string | null
}

export interface JoinedChallenge extends Challenge {
  participant_status: Participant['status']
}

export interface Invite {
  id: string
  challenge_id: string
  invitee_id: string
  status: 'pending' | 'accepted' | 'declined' | 'expired'
  expires_at: string
  created_at: string
}

export interface WalletBalance {
  available: number
  escrow: number
  pending: number
  total: number
  currency: string
}

export type WalletAccount = 'available' | 'escrow' | 'pending'

export interface WalletTransaction {
  id: string
  type: 'credit' | 'debit'
  account: WalletAccount
  amount: number
  balance_after: number
  reference: string
  narration: string
  created_at: string
}

export interface EarningsSummary {
  total_earned: number
  total_withdrawn: number
  current_balance: number
  in_escrow: number
  transaction_count: number
}

export interface UploadUrl {
  upload_url: string
  key: string
  expires_at: string
}

export interface DepositResult {
  payment_id: string
  authorization_url: string
  reference: string
}

export interface PageMeta {
  page: number
  per_page: number
  total: number
  total_pages: number
}

export interface Paged<T> {
  data: T[]
  meta: PageMeta
}

export interface PageParams {
  page?: number
  per_page?: number
}

export interface CreateChallengeInput {
  title: string
  description: string
  category: string
  rules: string | null
  challenge_type: ChallengeType
  submission_type: SubmissionType
  winner_selection: WinnerSelection
  reward_pool_amount: number
  max_participants: number | null
  deadline: string
  reward_tiers: { rank: number; percentage: number }[]
}

export interface UpdateChallengeInput {
  title?: string
  description?: string
  category?: string
  rules?: string | null
  max_participants?: number | null
  deadline?: string
}
