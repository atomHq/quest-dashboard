import { api } from './client'
import { ApiError, toApiError } from './errors'
import type {
  Challenge,
  ChallengeDetail,
  ChallengeStatus,
  ClientSession,
  CreateChallengeInput,
  DepositResult,
  EarningsSummary,
  Invite,
  JoinedChallenge,
  PageParams,
  Participant,
  Profile,
  RewardTier,
  Submission,
  SubmissionMedia,
  SubmissionWithMedia,
  UpdateChallengeInput,
  UploadUrl,
  WalletAccount,
  WalletBalance,
  WalletTransaction,
} from './types'

// ---------------------------------------------------------------------------
// Session (same-origin route handlers that own the refresh-token cookie)
// ---------------------------------------------------------------------------

async function sessionCall(path: string, body?: unknown, token?: string | null): Promise<ClientSession> {
  let res: Response
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      credentials: 'same-origin',
    })
  } catch {
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach Quest right now. Check your connection.")
  }
  const text = res.status === 204 ? '' : await res.text()
  const json = text ? JSON.parse(text) : undefined
  if (!res.ok) throw toApiError(res.status, json)
  return json?.data
}

export const sessionApi = {
  login: (body: { email: string; password: string }) => sessionCall('/api/session/login', body),
  signup: (body: { username: string; email: string; password: string; first_name?: string; last_name?: string }) =>
    sessionCall('/api/session/signup', body),
  logout: (token: string | null) => sessionCall('/api/session/logout', undefined, token),
}

// ---------------------------------------------------------------------------
// Auth (direct backend calls — no tokens involved)
// ---------------------------------------------------------------------------

export const authApi = {
  verifyEmail: (token: string) => api.post<void>('/auth/email/verify', { token }, { auth: false }),
  forgotPassword: (email: string) => api.post<{ message: string }>('/auth/forgot-password', { email }, { auth: false }),
  resetPassword: (token: string, new_password: string) =>
    api.post<void>('/auth/reset-password', { token, new_password }, { auth: false }),
  changePassword: (body: { current_password: string; new_password: string }) =>
    api.post<void>('/auth/change-password', body),
}

// ---------------------------------------------------------------------------
// Users
// ---------------------------------------------------------------------------

export const usersApi = {
  me: () => api.get<Profile>('/users/me'),
  updateMe: (body: { first_name?: string; last_name?: string; bio?: string }) => api.patch<Profile>('/users/me', body),
  avatarUploadUrl: (content_type: string) => api.post<UploadUrl>('/users/me/avatar/upload-url', { content_type }),
  confirmAvatar: (key: string) => api.post<Profile>('/users/me/avatar/confirm', { key }),
  byUsername: (username: string) =>
    api.get<Profile>(`/users/${encodeURIComponent(username)}`, { auth: false }),
  joined: (p: PageParams = {}) => api.list<JoinedChallenge>('/users/me/challenges/joined', { query: { ...p } }),
  invites: (p: PageParams = {}) => api.list<Invite>('/users/me/invites', { query: { ...p } }),
  /** BACKEND GAP: route not registered yet (ListByCreator exists in the service). */
  myChallenges: (p: PageParams = {}) => api.list<Challenge>('/users/me/challenges', { query: { ...p } }),
}

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

export interface ChallengeFilters extends PageParams {
  status?: ChallengeStatus
  category?: string
}

export const challengesApi = {
  list: (f: ChallengeFilters = {}) => api.list<Challenge>('/challenges', { query: { ...f }, auth: false }),
  trending: (p: PageParams = {}) => api.get<Challenge[]>('/challenges/trending', { query: { ...p }, auth: false }),
  get: (id: string) => api.get<ChallengeDetail>(`/challenges/${id}`, { auth: false }),
  create: (body: CreateChallengeInput) => api.post<ChallengeDetail>('/challenges', body),
  update: (id: string, body: UpdateChallengeInput) =>
    api.patch<{ challenge: Challenge; reward_tiers: RewardTier[] }>(`/challenges/${id}`, body),
  close: (id: string) => api.post<Challenge>(`/challenges/${id}/close`),
  selectWinners: (id: string, winners: { submission_id: string; rank: number }[]) =>
    api.post<{ challenge: Challenge; reward_tiers: RewardTier[] }>(`/challenges/${id}/winners`, { winners }),
  join: (id: string) => api.post<Participant>(`/challenges/${id}/join`),
  leave: (id: string) => api.delete<{ message: string }>(`/challenges/${id}/join`),
  participants: (id: string, p: PageParams = {}) =>
    api.list<Participant>(`/challenges/${id}/participants`, { query: { ...p }, auth: false }),
  invite: (id: string, user_id: string) => api.post<unknown>(`/challenges/${id}/invites`, { user_id }),
  acceptInvite: (id: string, inviteId: string) => api.post<unknown>(`/challenges/${id}/invites/${inviteId}/accept`),
  declineInvite: (id: string, inviteId: string) => api.post<unknown>(`/challenges/${id}/invites/${inviteId}/decline`),
}

// ---------------------------------------------------------------------------
// Submissions
// ---------------------------------------------------------------------------

export const submissionsApi = {
  list: (challengeId: string, p: PageParams = {}) =>
    api.list<SubmissionWithMedia>(`/challenges/${challengeId}/submissions`, { query: { ...p }, auth: false }),
  create: (challengeId: string, caption: string | undefined) =>
    api.post<Submission>(`/challenges/${challengeId}/submissions`, caption ? { caption } : {}),
  get: (id: string) => api.get<SubmissionWithMedia>(`/submissions/${id}`, { auth: false }),
  uploadUrl: (id: string, content_type: string) =>
    api.post<UploadUrl>(`/submissions/${id}/media/upload-url`, { content_type }),
  confirmMedia: (id: string, key: string) => api.post<SubmissionMedia>(`/submissions/${id}/media/confirm`, { key }),
  /** Creator-only: every entry to the challenge, any status. */
  reviewList: (challengeId: string, p: PageParams = {}) =>
    api.list<SubmissionWithMedia>(`/challenges/${challengeId}/submissions/review`, { query: { ...p } }),
  /** Creator-only: approve or reject an entry. */
  review: (id: string, status: 'approved' | 'rejected', reason?: string) =>
    api.patch<Submission>(`/submissions/${id}/review`, reason ? { status, reason } : { status }),
}

// ---------------------------------------------------------------------------
// Wallet & payments
// ---------------------------------------------------------------------------

export interface TransactionFilters extends PageParams {
  account?: WalletAccount
  from?: string
  to?: string
}

export const walletApi = {
  balance: () => api.get<WalletBalance>('/wallet'),
  transactions: (f: TransactionFilters = {}) => api.list<WalletTransaction>('/wallet/transactions', { query: { ...f } }),
  earnings: () => api.get<EarningsSummary>('/wallet/earnings'),
  /** Routed through /api/payments/deposit — see that handler for why. */
  deposit: (amountKobo: number, idempotencyKey: string) =>
    api.post<DepositResult>(
      '/api/payments/deposit',
      { amount: amountKobo, currency: 'NGN' },
      { local: true, headers: { 'Idempotency-Key': idempotencyKey } },
    ),
}
