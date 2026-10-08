import 'server-only'
import { NextResponse, type NextRequest } from 'next/server'
import type { TokenPair } from '@/lib/api/types'

export const BACKEND_URL =
  process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'https://quest-backend-cbc1.onrender.com/api/v1'

export const REFRESH_COOKIE = 'quest_rt'

/**
 * Calls the backend from a route handler. Forwards the caller's IP and User-Agent so the
 * backend's per-IP rate limiting and device tracking still see the real client.
 */
export async function callBackend(
  req: NextRequest,
  path: string,
  init: { method?: string; body?: unknown; headers?: Record<string, string> } = {},
) {
  const headers: Record<string, string> = { Accept: 'application/json', ...init.headers }
  if (init.body !== undefined) headers['Content-Type'] = 'application/json'
  const ua = req.headers.get('user-agent')
  if (ua) headers['User-Agent'] = ua
  const fwd = req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip')
  if (fwd) headers['X-Forwarded-For'] = fwd

  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: init.method ?? 'POST',
    headers,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    cache: 'no-store',
  })
  const text = res.status === 204 ? '' : await res.text()
  let body: unknown = undefined
  if (text) {
    try {
      body = JSON.parse(text)
    } catch {
      body = { error: { code: 'BAD_GATEWAY', message: 'Unexpected response from server' } }
    }
  }
  return { status: res.status, ok: res.ok, body }
}

/** Mirrors a backend response (status + body) back to the browser. */
export function passthrough(status: number, body: unknown) {
  if (status === 204 || body === undefined) return new NextResponse(null, { status })
  return NextResponse.json(body, { status })
}

export function unreachable() {
  return NextResponse.json(
    { error: { code: 'NETWORK_ERROR', message: "Can't reach Quest right now. Please try again." } },
    { status: 502 },
  )
}

/** Responds with the session (minus refresh token) and stores the refresh token in an httpOnly cookie. */
export function sessionResponse(pair: TokenPair, status = 200) {
  const { refresh_token, ...session } = pair
  const res = NextResponse.json({ data: session }, { status })
  res.cookies.set(REFRESH_COOKIE, refresh_token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: new Date(pair.refresh_expires_at),
  })
  return res
}

export function clearSessionCookie(res: NextResponse) {
  res.cookies.set(REFRESH_COOKIE, '', { httpOnly: true, path: '/', maxAge: 0 })
  return res
}
