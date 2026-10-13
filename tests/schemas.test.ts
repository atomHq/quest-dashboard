import { describe, expect, it } from 'vitest'
import { matchSchema, reportSchema, rewardsSchema, settingsSchema, signupSchema } from '@/lib/schemas'

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

  it('defaults to creator_funded for drafts saved before paid challenges', () => {
    const r = rewardsSchema.safeParse({ pool_naira: 5000, tiers: [{ rank: 1, percentage: 100 }] })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.funding_type).toBe('creator_funded')
  })

  it('accepts a paid challenge with an entry price and no pool', () => {
    const r = rewardsSchema.safeParse({
      funding_type: 'entry_funded',
      pool_naira: '',
      entry_price_naira: '1,000',
      tiers: [{ rank: 1, percentage: 100 }],
    })
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.entry_price_naira).toBe(1000)
  })

  it('requires an entry price for paid challenges', () => {
    const r = rewardsSchema.safeParse({ funding_type: 'entry_funded', pool_naira: 5000, entry_price_naira: '', tiers: [{ rank: 1, percentage: 100 }] })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.path.join('.') === 'entry_price_naira')).toBe(true)
  })

  it('rejects an entry price that does not exceed the fee', () => {
    // ₦0.50 = 50 kobo, which is exactly the minimum per-entry fee.
    const r = rewardsSchema.safeParse({ funding_type: 'entry_funded', entry_price_naira: '0.5', tiers: [{ rank: 1, percentage: 100 }] })
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.path.join('.') === 'entry_price_naira')).toBe(true)
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

describe('matchSchema', () => {
  const ok = {
    opponent: '@ada_99',
    title: 'FIFA 26',
    rules: '',
    best_of: '5' as const,
    stake_naira: '5,000',
    deadline: new Date(Date.now() + 2 * 3600_000).toISOString(),
  }
  const issueAt = (input: unknown, path: string) =>
    matchSchema.safeParse(input).error?.issues.some((i) => i.path.join('.') === path) ?? false

  it('accepts a staked best of 5, with or without the @', () => {
    const r = matchSchema.safeParse(ok)
    expect(r.success).toBe(true)
    if (r.success) expect(r.data.stake_naira).toBe(5000)
    expect(matchSchema.safeParse({ ...ok, opponent: 'ada_99', best_of: '' }).success).toBe(true)
  })

  it('rejects a bad opponent username', () => {
    expect(issueAt({ ...ok, opponent: 'ab' }, 'opponent')).toBe(true)
    expect(issueAt({ ...ok, opponent: 'ada-99' }, 'opponent')).toBe(true)
  })

  it('validates the stake like the backend', () => {
    expect(issueAt({ ...ok, stake_naira: '' }, 'stake_naira')).toBe(true)
    expect(issueAt({ ...ok, stake_naira: '0' }, 'stake_naira')).toBe(true)
    // ₦0.50 stake: the 50 kobo minimum fee would take all of it.
    expect(issueAt({ ...ok, stake_naira: '0.5' }, 'stake_naira')).toBe(true)
    expect(issueAt({ ...ok, stake_naira: '20,000,000' }, 'stake_naira')).toBe(true)
  })

  it('rejects an even series length and a deadline under an hour away', () => {
    expect(matchSchema.safeParse({ ...ok, best_of: '4' }).success).toBe(false)
    expect(issueAt({ ...ok, deadline: new Date(Date.now() + 10 * 60_000).toISOString() }, 'deadline')).toBe(true)
  })
})

describe('reportSchema', () => {
  const bo5 = reportSchema(5)
  const issueAt = (schema: ReturnType<typeof reportSchema>, input: unknown, path: string) =>
    schema.safeParse(input).error?.issues.some((i) => i.path.join('.') === path) ?? false

  it('needs a winner; scores are optional', () => {
    expect(bo5.safeParse({ creator_score: '', opponent_score: '' }).success).toBe(false)
    expect(bo5.safeParse({ winner: 'opponent', creator_score: '', opponent_score: '' }).success).toBe(true)
  })

  it('requires both scores or neither', () => {
    expect(issueAt(bo5, { winner: 'creator', creator_score: '3', opponent_score: '' }, 'opponent_score')).toBe(true)
  })

  it('gives the winner exactly the clinching games in a best of 5', () => {
    expect(bo5.safeParse({ winner: 'creator', creator_score: '3', opponent_score: '1' }).success).toBe(true)
    expect(bo5.safeParse({ winner: 'opponent', creator_score: '2', opponent_score: '3' }).success).toBe(true)
    expect(issueAt(bo5, { winner: 'creator', creator_score: '2', opponent_score: '1' }, 'creator_score')).toBe(true)
    expect(issueAt(bo5, { winner: 'creator', creator_score: '4', opponent_score: '0' }, 'creator_score')).toBe(true)
    expect(issueAt(bo5, { winner: 'opponent', creator_score: '3', opponent_score: '1' }, 'opponent_score')).toBe(true)
  })

  it('only needs the winner ahead when the series length is unknown', () => {
    const free = reportSchema(null)
    expect(free.safeParse({ winner: 'creator', creator_score: '4', opponent_score: '2' }).success).toBe(true)
    expect(free.safeParse({ winner: 'creator', creator_score: '2', opponent_score: '2' }).success).toBe(false)
    expect(free.safeParse({ winner: 'creator', creator_score: '1.5', opponent_score: '0' }).success).toBe(false)
  })
})
