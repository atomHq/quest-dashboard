export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly field?: string

  constructor(status: number, code: string, message: string, field?: string) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.field = field
  }
}

export const RATE_LIMIT_MESSAGE = 'Too many attempts, try again in a minute'

/**
 * Normalises both backend error envelopes into an ApiError:
 *   { error: { code, message, field? } }      — normal handlers
 *   { error: "Unauthorized", message: "..." } — JWT middleware 401
 */
export function toApiError(status: number, body: unknown): ApiError {
  if (status === 429) return new ApiError(429, 'RATE_LIMITED', RATE_LIMIT_MESSAGE)

  const b = (body ?? {}) as Record<string, unknown>
  const err = b.error
  if (err && typeof err === 'object') {
    const e = err as { code?: string; message?: string; field?: string }
    return new ApiError(status, e.code ?? 'UNKNOWN', e.message ?? 'Something went wrong', e.field || undefined)
  }
  if (typeof err === 'string') {
    const code = status === 401 ? 'UNAUTHORIZED' : err.toUpperCase().replace(/\s+/g, '_')
    return new ApiError(status, code, typeof b.message === 'string' ? b.message : err)
  }
  return new ApiError(status, status >= 500 ? 'SERVER_ERROR' : 'UNKNOWN', 'Something went wrong. Please try again.')
}

const FRIENDLY: Record<string, string> = {
  NETWORK_ERROR: "Can't reach Quest right now. Check your connection.",
  NOT_FOUND: "We couldn't find that.",
  FORBIDDEN: "You don't have permission to do that.",
  NOT_DRAFT: 'Only draft challenges can be edited.',
  INVALID_PERCENTAGES: 'Reward percentages must add up to exactly 100%.',
  DUPLICATE_RANK: 'Each reward tier needs a unique rank.',
  NO_REWARD_TIERS: 'Add at least one reward tier.',
  DEADLINE_IN_PAST: 'The deadline must be in the future.',
  DEADLINE_TOO_SOON: 'The deadline must be at least 1 hour from now.',
  INSUFFICIENT_BALANCE: "Your wallet doesn't have enough available balance.",
  NOT_ACTIVE: 'This challenge is not active.',
  NOT_CLOSED: 'Winners can only be picked once the challenge is closed.',
  WINNER_COUNT_MISMATCH: 'Pick exactly one winner for every reward tier.',
  INVALID_WINNER: 'One of the selected submissions is not eligible to win.',
  DUPLICATE_WINNER_RANK: 'Each rank can only have one winner.',
  DUPLICATE_WINNER: 'A submission can only win one rank.',
  ALREADY_JOINED: "You've already joined this challenge.",
  CREATOR_CANNOT_JOIN: "You can't join your own challenge.",
  MAX_PARTICIPANTS_REACHED: 'This challenge is full.',
  CHALLENGE_NOT_ACTIVE: 'This challenge is no longer accepting entries.',
  INVITE_REQUIRED: 'This challenge is invite-only.',
  INVITE_EXPIRED: 'This invite has expired.',
  INVITE_NOT_PENDING: 'This invite has already been used.',
  NOT_PARTICIPANT: "You're not a participant in this challenge.",
  ALREADY_SUBMITTED: "You've already submitted an entry to this challenge.",
  CREATOR_CANNOT_SUBMIT: "You can't submit to your own challenge.",
  REVIEW_CLOSED: 'Entries can only be reviewed before winners are chosen.',
  INVALID_MEDIA_TYPE: "That file type isn't allowed for this challenge.",
  MEDIA_KEY_MISMATCH: 'Upload mismatch. Please try uploading again.',
  MEDIA_NOT_UPLOADED: "The upload didn't finish. Please try again.",
  AVATAR_NOT_UPLOADED: "The avatar upload didn't finish. Please try again.",
  INVALID_AVATAR_TYPE: 'Avatars must be JPEG, PNG or WebP.',
  INVALID_EMAIL_VERIFICATION_TOKEN: 'This verification link is invalid or has expired.',
  INVALID_RESET_TOKEN: 'This reset link is invalid or has expired.',
  MISSING_IDEMPOTENCY_KEY: 'Something went wrong starting the payment. Please retry.',
  RATE_LIMITED: RATE_LIMIT_MESSAGE,
}

/** User-facing message for any thrown value. */
export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) {
    // Prefer server message for validation / auth errors — they're specific.
    if (err.code === 'VALIDATION_FAILED' || err.status === 401) return err.message
    return FRIENDLY[err.code] ?? err.message
  }
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}

export function isApiError(err: unknown, code?: string): err is ApiError {
  return err instanceof ApiError && (code === undefined || err.code === code)
}
