import { NextResponse, type NextRequest } from 'next/server'
import { REFRESH_COOKIE, callBackend, clearSessionCookie } from '@/lib/server/backend'

export async function POST(req: NextRequest) {
  const refreshToken = req.cookies.get(REFRESH_COOKIE)?.value
  const authorization = req.headers.get('authorization')
  if (refreshToken && authorization) {
    // Best effort: the cookie is cleared regardless of the backend's answer.
    await callBackend(req, '/auth/logout', {
      body: { refresh_token: refreshToken },
      headers: { Authorization: authorization },
    }).catch(() => undefined)
  }
  return clearSessionCookie(new NextResponse(null, { status: 204 }))
}
