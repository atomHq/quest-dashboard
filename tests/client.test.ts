import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { api, setAuthFailureHandler } from '@/lib/api/client'
import { ApiError, RATE_LIMIT_MESSAGE, toApiError } from '@/lib/api/errors'
import { useSession } from '@/stores/session'

function json(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), { status })
}

const user = { id: 'u1', username: 'ada' } as never

describe('toApiError', () => {
  it('reads the normal envelope', () => {
    const e = toApiError(422, { error: { code: 'VALIDATION_FAILED', message: 'bad', field: 'email' } })
    expect([e.code, e.message, e.field]).toEqual(['VALIDATION_FAILED', 'bad', 'email'])
  })
  it('reads the JWT middleware envelope', () => {
    const e = toApiError(401, { error: 'Unauthorized', message: 'Invalid or expired token' })
    expect([e.code, e.message]).toEqual(['UNAUTHORIZED', 'Invalid or expired token'])
  })
  it('maps 429 to the rate-limit message', () => {
    expect(toApiError(429, undefined).message).toBe(RATE_LIMIT_MESSAGE)
  })
})

describe('api client', () => {
  const fetchMock = vi.fn()
  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
    useSession.setState({ status: 'authed', accessToken: 'old', accessExpiresAt: null, user })
  })
  afterEach(() => {
    fetchMock.mockReset()
    vi.unstubAllGlobals()
    setAuthFailureHandler(null)
  })

  it('unwraps { data } and never parses a 204 body', async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { ok: 1 } }))
    expect(await api.get('/x')).toEqual({ ok: 1 })
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))
    expect(await api.post('/y')).toBeUndefined()
  })

  it('refreshes once for concurrent JWT 401s and retries with the new token', async () => {
    let refreshes = 0
    fetchMock.mockImplementation(async (url: string, init: RequestInit) => {
      if (url === '/api/session/refresh') {
        refreshes++
        await new Promise((r) => setTimeout(r, 10))
        return json(200, { data: { access_token: 'new', access_expires_at: '2099-01-01T00:00:00Z', user } })
      }
      const auth = (init.headers as Record<string, string>).Authorization
      return auth === 'Bearer new'
        ? json(200, { data: url })
        : json(401, { error: 'Unauthorized', message: 'Invalid or expired token' })
    })
    const results = await Promise.all([api.get('/a'), api.get('/b'), api.get('/c')])
    expect(results.map(String).map((u) => u.slice(-2))).toEqual(['/a', '/b', '/c'])
    expect(refreshes).toBe(1)
    expect(useSession.getState().accessToken).toBe('new')
  })

  it('does not refresh on a handler 401 (normal envelope)', async () => {
    const onFail = vi.fn()
    setAuthFailureHandler(onFail)
    fetchMock.mockResolvedValueOnce(json(401, { error: { code: 'UNAUTHORIZED', message: 'invalid email or password' } }))
    await expect(api.post('/auth/change-password', {})).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(onFail).not.toHaveBeenCalled()
    expect(useSession.getState().status).toBe('authed')
  })

  it('clears the session and calls the failure handler when refresh fails', async () => {
    const onFail = vi.fn()
    setAuthFailureHandler(onFail)
    fetchMock.mockImplementation(async (url: string) =>
      url === '/api/session/refresh'
        ? json(401, { error: { code: 'NO_SESSION', message: 'Not signed in' } })
        : json(401, { error: 'Unauthorized', message: 'expired' }),
    )
    await expect(api.get('/wallet')).rejects.toBeInstanceOf(ApiError)
    expect(onFail).toHaveBeenCalledOnce()
    expect(useSession.getState().status).toBe('anon')
  })
})
