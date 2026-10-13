'use client'

import { useEffect } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { isApiError } from '@/lib/api/errors'
import {
  adminApi,
  challengesApi,
  matchesApi,
  submissionsApi,
  usersApi,
  walletApi,
  type ChallengeFilters,
  type TransactionFilters,
} from '@/lib/api/endpoints'
import type { Challenge, ChallengeDetail, ChallengeStatus, HeadToHeadState, MatchView } from '@/lib/api/types'
import { fetchSystemChallenges } from '@/lib/system-challenges'
import { DEFAULT_PER_PAGE } from '@/lib/constants'
import { useSession } from '@/stores/session'

export const qk = {
  me: ['me'] as const,
  wallet: ['wallet'] as const,
  earnings: ['earnings'] as const,
  tx: (f: TransactionFilters) => ['tx', f] as const,
  challenges: (f: Omit<ChallengeFilters, 'page'>) => ['challenges', f] as const,
  trending: ['trending'] as const,
  challenge: (id: string) => ['challenge', id] as const,
  joined: ['joined'] as const,
  submissions: (id: string) => ['submissions', id] as const,
  submission: (id: string) => ['submission', id] as const,
  participants: (id: string) => ['participants', id] as const,
  profile: (username: string) => ['profile', username] as const,
  myChallenges: ['my-challenges'] as const,
  invites: ['invites'] as const,
  search: (q: string) => ['challenges', 'search', q] as const,
  systemChallenges: ['system-challenges'] as const,
  match: (id: string) => ['match', id] as const,
  matches: ['matches'] as const,
  disputes: ['disputes'] as const,
}

function useAuthed() {
  return useSession((s) => s.status === 'authed')
}

export function useMe() {
  const authed = useAuthed()
  return useQuery({
    queryKey: qk.me,
    queryFn: usersApi.me,
    enabled: authed,
    initialData: () => useSession.getState().user ?? undefined,
    staleTime: 60_000,
  })
}

export function useWallet(opts: { refetchInterval?: number | false } = {}) {
  const authed = useAuthed()
  const setWallet = useSession((s) => s.setWallet)
  const q = useQuery({
    queryKey: qk.wallet,
    queryFn: walletApi.balance,
    enabled: authed,
    refetchInterval: opts.refetchInterval,
    staleTime: 15_000,
  })
  useEffect(() => {
    if (q.data) setWallet(q.data)
  }, [q.data, setWallet])
  return q
}

export function useEarnings() {
  return useQuery({ queryKey: qk.earnings, queryFn: walletApi.earnings, enabled: useAuthed() })
}

export function useTransactions(f: TransactionFilters) {
  return useQuery({
    queryKey: qk.tx(f),
    queryFn: () => walletApi.transactions(f),
    enabled: useAuthed(),
    placeholderData: keepPreviousData,
  })
}

export function useChallengesFeed(f: { status?: ChallengeStatus; category?: string }) {
  return useInfiniteQuery({
    queryKey: qk.challenges(f),
    queryFn: ({ pageParam }) => challengesApi.list({ ...f, page: pageParam, per_page: DEFAULT_PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined),
  })
}

/** Trending has no meta — stop when a page comes back short. */
export function useTrending(enabled = true) {
  return useInfiniteQuery({
    queryKey: qk.trending,
    queryFn: ({ pageParam }) => challengesApi.trending({ page: pageParam, per_page: DEFAULT_PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last, all) => (last.length < DEFAULT_PER_PAGE ? undefined : all.length + 1),
    enabled,
  })
}

export function useChallenge(id: string, opts: { pollWhile?: (d: ChallengeDetail) => boolean; intervalMs?: number } = {}) {
  const { pollWhile, intervalMs = 3_000 } = opts
  return useQuery({
    queryKey: qk.challenge(id),
    queryFn: () => challengesApi.get(id),
    refetchInterval: (q) => (pollWhile && q.state.data && pollWhile(q.state.data) ? intervalMs : false),
  })
}

/** Title/description search for the header; pass the debounced term. Needs at least 2 characters. */
export function useSearchChallenges(q: string) {
  const term = q.trim()
  return useQuery({
    queryKey: qk.search(term),
    queryFn: () => challengesApi.search(term, { per_page: 6 }),
    enabled: term.length >= 2,
    staleTime: 60_000,
    placeholderData: (prev) => prev,
  })
}

/** Challenges run by the Quest team (GET /challenges/system). */
export function useSystemChallenges() {
  // One retry at most: the section hides itself on error rather than spinning for minutes.
  return useQuery({ queryKey: qk.systemChallenges, queryFn: fetchSystemChallenges, staleTime: 5 * 60_000, retry: 1 })
}

/** All challenges the current user has joined (walks every page; used for "already joined" checks). */
export function useJoined() {
  return useQuery({
    queryKey: qk.joined,
    enabled: useAuthed(),
    staleTime: 30_000,
    queryFn: async () => {
      const first = await usersApi.joined({ page: 1, per_page: 100 })
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.meta.total_pages - 1) }, (_, i) =>
          usersApi.joined({ page: i + 2, per_page: 100 }),
        ),
      )
      return [first, ...rest].flatMap((p) => p.data)
    },
  })
}

export function useInvites(enabled = true) {
  const authed = useAuthed()
  return useQuery({
    queryKey: qk.invites,
    enabled: authed && enabled,
    queryFn: async () => (await usersApi.invites({ per_page: 100 })).data,
  })
}

export function useSubmissions(challengeId: string) {
  return useInfiniteQuery({
    queryKey: qk.submissions(challengeId),
    queryFn: ({ pageParam }) => submissionsApi.list(challengeId, { page: pageParam, per_page: DEFAULT_PER_PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined),
  })
}

/** Every approved submission (all pages) — used by the winner picker. */
export function useAllSubmissions(challengeId: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.submissions(challengeId), 'all'],
    enabled,
    queryFn: async () => {
      const first = await submissionsApi.list(challengeId, { page: 1, per_page: 100 })
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.meta.total_pages - 1) }, (_, i) =>
          submissionsApi.list(challengeId, { page: i + 2, per_page: 100 }),
        ),
      )
      return [first, ...rest].flatMap((p) => p.data)
    },
  })
}

/** Every entry to a challenge, any status — creator only. */
export function useReviewSubmissions(challengeId: string, enabled = true) {
  return useQuery({
    queryKey: [...qk.submissions(challengeId), 'review'],
    enabled,
    queryFn: async () => {
      const first = await submissionsApi.reviewList(challengeId, { page: 1, per_page: 100 })
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.meta.total_pages - 1) }, (_, i) =>
          submissionsApi.reviewList(challengeId, { page: i + 2, per_page: 100 }),
        ),
      )
      return [first, ...rest].flatMap((p) => p.data)
    },
  })
}

export function useSubmission(id: string | null) {
  return useQuery({
    queryKey: qk.submission(id ?? ''),
    queryFn: () => submissionsApi.get(id!),
    enabled: !!id,
  })
}

export function useParticipants(challengeId: string) {
  return useInfiniteQuery({
    queryKey: qk.participants(challengeId),
    queryFn: ({ pageParam }) => challengesApi.participants(challengeId, { page: pageParam, per_page: 50 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.total_pages ? last.meta.page + 1 : undefined),
  })
}

export function useProfile(username: string) {
  return useQuery({
    queryKey: qk.profile(username),
    queryFn: () => usersApi.byUsername(username),
    retry: (n, err) => !isApiError(err, 'NOT_FOUND') && n < 2,
  })
}

/**
 * Challenges the current user created. A 404 (backend deployed without GET /users/me/challenges)
 * resolves to an empty list so the dashboard shows its empty state instead of an error.
 */
export function useMyChallenges() {
  return useQuery({
    queryKey: qk.myChallenges,
    enabled: useAuthed(),
    retry: false,
    queryFn: async (): Promise<{ items: Challenge[]; supported: boolean }> => {
      try {
        const first = await usersApi.myChallenges({ page: 1, per_page: 100 })
        const rest = await Promise.all(
          Array.from({ length: Math.max(0, first.meta.total_pages - 1) }, (_, i) =>
            usersApi.myChallenges({ page: i + 2, per_page: 100 }),
          ),
        )
        return { items: [first, ...rest].flatMap((p) => p.data), supported: true }
      } catch (err) {
        if (isApiError(err) && (err.status === 404 || err.status === 405)) return { items: [], supported: false }
        throw err
      }
    },
  })
}

export interface AppNotification {
  id: string
  title: string
  body: string
  created_at: string
  read: boolean
  href?: string
}

/** BACKEND GAP: no notifications API yet. */
export function useNotifications(): { data: AppNotification[]; unread: number; isLoading: boolean } {
  return { data: [], unread: 0, isLoading: false }
}

/** A head-to-head match. Polls while the payout runs, so the page flips to "paid" on its own. */
export function useMatch(id: string) {
  return useQuery({
    queryKey: qk.match(id),
    queryFn: () => matchesApi.get(id),
    enabled: useAuthed(),
    retry: (n, err) => !isApiError(err, 'NOT_FOUND') && n < 2,
    refetchInterval: (q) => (q.state.data && isSettling(q.state.data) ? 3_000 : false),
  })
}

function isSettling(m: MatchView) {
  return m.head_to_head.state === 'settling'
}

/** Matches the current user plays in (first 100, newest first), optionally by state. */
export function useMyMatches(state?: HeadToHeadState[]) {
  return useQuery({
    queryKey: [...qk.matches, state ?? 'all'],
    enabled: useAuthed(),
    queryFn: async () => (await matchesApi.mine({ per_page: 100, state })).data,
  })
}

/** Admin: disputed matches, oldest first. */
export function useDisputes(enabled = true) {
  return useQuery({
    queryKey: qk.disputes,
    enabled: useAuthed() && enabled,
    queryFn: async () => (await adminApi.disputes({ per_page: 100 })).data,
  })
}
