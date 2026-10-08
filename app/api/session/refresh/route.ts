import { NextResponse, type NextRequest } from 'next/server'
import type { TokenPair } from '@/lib/api/types'
import {
  REFRESH_COOKIE,
  callBackend,
  clearSessionCookie,
  passthrough,
  sessionResponse,
  unreachable,
} from '@/lib/server/backend'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  if (!refreshToken) {
    return NextResponse.json({ error: { code: 'NO_SESSION', message: 'Not signed in' } }, { status: 401 })
  }
  try {
    const r = await callBackend(req, '/auth/refresh', { body: { refresh_token: refreshToken } })
    if (r.ok) return sessionResponse((r.body as { data: TokenPair }).data)
    // Only drop the cookie when the backend rejected the token, not on rate limits / outages.
    const res = passthrough(r.status, r.body) as NextResponse
    return r.status === 401 || r.status === 400 ? clearSessionCookie(res) : res
  } catch {
    return unreachable()
  }
}
