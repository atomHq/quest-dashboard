import type { NextRequest } from 'next/server'
import type { TokenPair } from '@/lib/api/types'
import { callBackend, passthrough, sessionResponse, unreachable } from '@/lib/server/backend'

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}))
  try {
    const r = await callBackend(req, '/auth/signup', { body })
    if (!r.ok) return passthrough(r.status, r.body)
    return sessionResponse((r.body as { data: TokenPair }).data, r.status)
  } catch {
    return unreachable()
  }
}
