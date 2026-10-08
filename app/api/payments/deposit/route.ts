import { NextResponse, type NextRequest } from 'next/server'
import { callBackend, passthrough, unreachable } from '@/lib/server/backend'

/**
 * Server-side proxy for POST /payments/deposit. The backend's CORS policy does not allow the
 * Idempotency-Key header from the browser, so the request is relayed from here instead.
 */
export async function POST(req: NextRequest) {
  const authorization = req.headers.get('authorization')
  const idempotencyKey = req.headers.get('idempotency-key')
  if (!authorization) {
    return NextResponse.json({ error: 'Unauthorized', message: 'missing access token' }, { status: 401 })
  }
  const headers: Record<string, string> = { Authorization: authorization }
  if (idempotencyKey) headers['Idempotency-Key'] = idempotencyKey
  const body = await req.json().catch(() => ({}))
  try {
    const r = await callBackend(req, '/payments/deposit', { body, headers })
    return passthrough(r.status, r.body)
  } catch {
    return unreachable()
  }
}
