// Shared API types. Mirrors the quest-backend contract — all money fields are KOBO integers.

export type ChallengeStatus = 'draft' | 'active' | 'closed' | 'judging' | 'completed' | 'cancelled'
export type SubmissionType = 'video' | 'audio' | 'image' | 'written'
/** head_to_head: a private 1v1 staked match, served by /head-to-heads rather than /challenges. */
export type ChallengeType = 'public' | 'direct' | 'head_to_head'
export type WinnerSelection = 'creator' | 'community' | 'hybrid'
/**
 * creator_funded: the creator escrows the pool up front. entry_funded: each entrant pays entry_price from their wallet.
 * stake: a head-to-head match where both players stake entry_price.
 */
export type FundingType = 'creator_funded' | 'entry_funded' | 'stake'

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
  funding_type: FundingType
  /** Set only for entry_funded challenges. */
  entry_price: number | null
  /** Platform fee kept from each entry; 0 for creator_funded. */
  entry_platform_fee: number
  /** Run by the Quest team ("Quest Originals"); only admins create these. */
  is_system: boolean
}

export type MediaType = 'image' | 'video' | 'audio'

/** One of up to three images, videos or audio clips illustrating a challenge. */
export interface ChallengeMedia {
  id: string
  media_type: MediaType
  content_type: string
  url: string
  position: number
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

/** What one entry to a paid challenge costs and where it goes. */
export interface EntrySummary {
  entry_price: number
  platform_fee_per_entry: number
  pool_per_entry: number
}

export interface ChallengeDetail {
  challenge: Challenge
  reward_tiers: RewardTier[]
  escrow_summary: EscrowSummary
  /** Set for entry_funded challenges. */
  entry_summary?: EntrySummary | null
  media?: ChallengeMedia[]
}

/** An item of GET /challenges/system. */
export interface SystemChallengeItem {
  challenge: Challenge
  entry_summary: EntrySummary | null
  media: ChallengeMedia[]
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
  funding_type?: FundingType
  entry_price?: number
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

// ---------------------------------------------------------------------------
// Head-to-head matches
// ---------------------------------------------------------------------------

/**
 * awaiting_opponent → in_play → settling → settled, or → disputed (an admin decides) → settling / refunded.
 * refunded also covers declined, cancelled and timed-out matches.
 */
export type HeadToHeadState = 'awaiting_opponent' | 'in_play' | 'disputed' | 'settling' | 'settled' | 'refunded'
export type HeadToHeadOutcome = 'creator' | 'opponent' | 'refund'
export type MatchRole = 'creator' | 'opponent' | 'admin'

export interface HeadToHead {
  challenge_id: string
  creator_id: string
  opponent_id: string
  /** Series length (best of 5 = 5); null for a single game or untracked score. */
  best_of: number | null
  state: HeadToHeadState
  accepted_at: string | null
  /** Results lock at this time: a lone report then stands, no report refunds both. */
  report_by: string
  disputed_at: string | null
  /** Shown on disputed matches: upload evidence before an admin decides. */
  evidence_by: string | null
  winner_id: string | null
  outcome: HeadToHeadOutcome | null
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export interface MatchPlayer {
  id: string
  username: string
  avatar_url: string | null
}

export interface MatchReport {
  challenge_id: string
  reporter_id: string
  winner_id: string
  creator_score: number | null
  opponent_score: number | null
  created_at: string
}

export interface MatchEvidence {
  id: string
  uploader_id: string
  media_type: 'image' | 'video'
  content_type: string
  url: string
  created_at: string
}

/** Kobo. pot = 2 × stake; winner_takes = 2 × (stake − fee_per_stake). */
export interface StakeSummary {
  stake: number
  fee_per_stake: number
  pot: number
  winner_takes: number
}

export interface MatchView {
  challenge: Challenge
  reward_tiers: RewardTier[]
  head_to_head: HeadToHead
  creator: MatchPlayer
  opponent: MatchPlayer
  reports: MatchReport[]
  evidence: MatchEvidence[]
  stake_summary: StakeSummary
  my_role: MatchRole
}

export interface MatchListItem {
  challenge: Challenge
  head_to_head: HeadToHead
  creator: MatchPlayer
  opponent: MatchPlayer
  stake_summary: StakeSummary
  my_role: MatchRole
}

export interface CreateMatchInput {
  opponent_username: string
  title: string
  rules?: string | null
  best_of?: number | null
  /** Kobo. */
  stake: number
  deadline: string
}

export interface ReportMatchInput {
  winner_id: string
  creator_score?: number | null
  opponent_score?: number | null
}
