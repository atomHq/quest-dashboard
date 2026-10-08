'use client'

import { useEffect } from 'react'
import { keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { isApiError } from '@/lib/api/errors'
import {
  challengesApi,
  submissionsApi,
  usersApi,
  walletApi,
  type ChallengeFilters,
  type TransactionFilters,
} from '@/lib/api/endpoints'
import type { Challenge, ChallengeDetail, ChallengeStatus } from '@/lib/api/types'
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
 * BACKEND GAP: GET /users/me/challenges isn't routed yet. A 404 resolves to an empty list so the
 * dashboard shows its empty state, and starts working as soon as the route ships.
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
