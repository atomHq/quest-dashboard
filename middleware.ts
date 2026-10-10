import { NextResponse, type NextRequest } from 'next/server'

// Mirrors REFRESH_COOKIE in lib/server/backend.ts (that module is server-only and not edge-safe to import here).
const REFRESH_COOKIE = 'quest_rt'

/**
 * Sends visitors without a session to /login before a private page renders. The refresh cookie
 * carries the refresh token's expiry, so the browser drops it once the session has expired. A
 * token the backend has revoked is still caught client-side: the refresh fails, the cookie is
 * cleared and RequireAuth redirects.
 */
export function middleware(req: NextRequest) {
  if (req.cookies.get(REFRESH_COOKIE)?.value) return NextResponse.next()

  const login = req.nextUrl.clone()
  login.pathname = '/login'
  login.search = `?next=${encodeURIComponent(req.nextUrl.pathname + req.nextUrl.search)}`
  return NextResponse.redirect(login)
}

export const config = {
  matcher: ['/dashboard/:path*', '/wallet/:path*', '/settings/:path*'],
}
