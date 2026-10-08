import { describe, expect, it } from 'vitest'
import { rewardsSchema, settingsSchema, signupSchema } from '@/lib/schemas'

describe('rewardsSchema', () => {
  it('accepts tiers summing to 100 with unique ranks', () => {
    const r = rewardsSchema.safeParse({ pool_naira: '5,000', tiers: [{ rank: '1', percentage: '60' }, { rank: 2, percentage: 40 }] })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.pool_naira).toBe(5000)
  })

  it('rejects percentages not summing to 100', () => {
    const r = rewardsSchema.safeParse({ pool_naira: 5000, tiers: [{ rank: 1, percentage: 60 }, { rank: 2, percentage: 30 }] })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.path.join('.') === 'tiers')).toBe(true)
  })

  it('rejects duplicate ranks', () => {
    const r = rewardsSchema.safeParse({ pool_naira: 5000, tiers: [{ rank: 1, percentage: 50 }, { rank: 1, percentage: 50 }] })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.path.join('.') === 'tiers.1.rank')).toBe(true)
  })

  it('rejects out-of-range and fractional percentages', () => {
    expect(rewardsSchema.safeParse({ pool_naira: 5000, tiers: [{ rank: 1, percentage: 101 }] }).success).toBe(false)
    expect(rewardsSchema.safeParse({ pool_naira: 5000, tiers: [{ rank: 1, percentage: 99.5 }, { rank: 2, percentage: 0.5 }] }).success).toBe(false)
  })

  it('rejects an empty pool', () => {
    expect(rewardsSchema.safeParse({ pool_naira: '', tiers: [{ rank: 1, percentage: 100 }] }).success).toBe(false)
  })
})

describe('settingsSchema', () => {
  const base = { submission_type: 'video', challenge_type: 'public', winner_selection: 'creator', max_participants: '' }

  it('requires a deadline at least an hour away', () => {
    const soon = new Date(Date.now() + 30 * 60_000).toISOString()
    const later = new Date(Date.now() + 2 * 3600_000).toISOString()
    expect(settingsSchema.safeParse({ ...base, deadline: soon }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...base, deadline: later }).success).toBe(true)
  })

  it('validates max participants', () => {
    const deadline = new Date(Date.now() + 2 * 3600_000).toISOString()
    expect(settingsSchema.safeParse({ ...base, deadline, max_participants: '0' }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...base, deadline, max_participants: '2.5' }).success).toBe(false)
    expect(settingsSchema.safeParse({ ...base, deadline, max_participants: '10' }).success).toBe(true)
  })
})

describe('signupSchema', () => {
  const ok = { username: 'ada_99', email: 'ada@example.com', password: 'hunter22!', confirm_password: 'hunter22!' }
  it('accepts valid input', () => expect(signupSchema.safeParse(ok).success).toBe(true))
  it('rejects bad usernames', () => {
    expect(signupSchema.safeParse({ ...ok, username: 'ab' }).success).toBe(false)
    expect(signupSchema.safeParse({ ...ok, username: 'ada-99' }).success).toBe(false)
  })
  it('requires matching passwords', () => {
    expect(signupSchema.safeParse({ ...ok, confirm_password: 'nope12345' }).success).toBe(false)
  })
})
