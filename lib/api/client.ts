import { useSession } from '@/stores/session'
import { ApiError, toApiError } from './errors'
import type { ClientSession, Paged } from './types'

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'https://quest-backend-cbc1.onrender.com/api/v1'

type Query = Record<string, string | number | boolean | null | undefined>

export interface RequestOptions {
  body?: unknown
  query?: Query
  headers?: Record<string, string>
  /** Set false for endpoints that must never trigger a refresh/redirect (default true). */
  auth?: boolean
  signal?: AbortSignal
  /** Call a same-origin Next.js route (e.g. /api/payments/deposit) instead of the backend. */
  local?: boolean
}

// ---------------------------------------------------------------------------
// Session refresh (single-flight) and auth-failure handling
// ---------------------------------------------------------------------------

let refreshing: Promise<boolean> | null = null
let onAuthFailure: (() => void) | null = null

/** Registered by the app shell so the client can redirect to /login without importing the router. */
export function setAuthFailureHandler(fn: (() => void) | null) {
  onAuthFailure = fn
}

/**
 * Exchanges the httpOnly refresh cookie for a new access token. Concurrent callers share one
 * in-flight request. Resolves true on success (store updated), false otherwise.
 */
export function refreshSession(): Promise<boolean> {
  if (!refreshing) {
    refreshing = (async () => {
      try {
        const res = await fetch('/api/session/refresh', { method: 'POST', credentials: 'same-origin' })
        if (!res.ok) return false
        const { data } = (await res.json()) as { data: ClientSession }
        useSession.getState().setSession(data)
        return true
      } catch {
        return false
      }
    })().finally(() => {
      refreshing = null
    })
  }
  return refreshing
}

function handleAuthFailure() {
  useSession.getState().clear()
  onAuthFailure?.()
}

// ---------------------------------------------------------------------------
// Core request
// ---------------------------------------------------------------------------

function buildUrl(path: string, query?: Query, local?: boolean) {
  const base = local ? '' : API_URL
  const qs = new URLSearchParams()
  for (const [k, v] of Object.entries(query ?? {})) {
    if (v !== undefined && v !== null && v !== '') qs.set(k, String(v))
  }
  const q = qs.toString()
  return `${base}${path}${q ? `?${q}` : ''}`
}

async function send(method: string, path: string, opts: RequestOptions, token: string | null) {
  const headers: Record<string, string> = { Accept: 'application/json', ...opts.headers }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'
  if (token) headers.Authorization = `Bearer ${token}`
  try {
    return await fetch(buildUrl(path, opts.query, opts.local), {
      method,
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
      credentials: opts.local ? 'same-origin' : 'omit',
    })
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') throw e
    throw new ApiError(0, 'NETWORK_ERROR', "Can't reach Quest right now. Check your connection.")
  }
}

/** Reads the body without ever calling res.json() on an empty / 204 response. */
async function readBody(res: Response): Promise<unknown> {
  if (res.status === 204) return undefined
  const text = await res.text()
  if (!text) return undefined
  try {
    return JSON.parse(text)
  } catch {
    return undefined
  }
}

function isTokenRejection(body: unknown) {
  const err = (body as { error?: unknown } | undefined)?.error
  return err === undefined || typeof err === 'string'
}

async function request<E>(method: string, path: string, opts: RequestOptions = {}): Promise<E> {
  const useAuth = opts.auth !== false
  const token = useAuth ? useSession.getState().accessToken : null
  let res = await send(method, path, opts, token)

  let body = await readBody(res)

  // Only the JWT middleware's 401 ({ error: "Unauthorized", message }) means the token is bad.
  // Handler 401s use the normal envelope (e.g. wrong current password) and are plain errors.
  if (res.status === 401 && useAuth && isTokenRejection(body)) {
    // Another request may already have refreshed while this one was in flight.
    const current = useSession.getState().accessToken
    const ok = current && current !== token ? true : await refreshSession()
    if (!ok) {
      handleAuthFailure()
      throw toApiError(401, body)
    }
    res = await send(method, path, opts, useSession.getState().accessToken)
    body = await readBody(res)
    if (res.status === 401 && isTokenRejection(body)) {
      handleAuthFailure()
      throw toApiError(401, body)
    }
  }

  if (!res.ok) throw toApiError(res.status, body)
  return body as E
}

async function unwrap<T>(method: string, path: string, opts?: RequestOptions): Promise<T> {
  const body = await request<{ data: T } | undefined>(method, path, opts)
  return body?.data as T
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) => unwrap<T>('GET', path, opts),
  post: <T>(path: string, body?: unknown, opts?: RequestOptions) => unwrap<T>('POST', path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: RequestOptions) => unwrap<T>('PATCH', path, { ...opts, body }),
  delete: <T>(path: string, opts?: RequestOptions) => unwrap<T>('DELETE', path, opts),
  /** List endpoints: returns { data, meta } untouched. */
  list: async <T>(path: string, opts?: RequestOptions): Promise<Paged<T>> => {
    const body = await request<Paged<T>>('GET', path, opts)
    return { data: body?.data ?? [], meta: body?.meta ?? { page: 1, per_page: 0, total: 0, total_pages: 0 } }
  },
}
