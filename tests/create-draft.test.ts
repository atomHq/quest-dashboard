import { describe, expect, it } from 'vitest'
import { EMPTY_DRAFT, draftTotalKobo, toCreateInput, type CreateDraft } from '@/lib/create-draft'

const base: CreateDraft = {
  ...EMPTY_DRAFT,
  details: { title: 'Dance off', description: '<p>Show us</p>', category: EMPTY_DRAFT.details.category, rules: '' },
  settings: { ...EMPTY_DRAFT.settings, deadline: '2030-01-01T12:00' },
}

describe('toCreateInput', () => {
  it('sends a creator-funded pool for free challenges', () => {
    const d: CreateDraft = { ...base, rewards: { ...EMPTY_DRAFT.rewards, pool_naira: '5,000' } }
    const input = toCreateInput(d)
    expect(input.funding_type).toBe('creator_funded')
    expect(input.reward_pool_amount).toBe(500_000)
    expect(input.entry_price).toBeUndefined()
    expect(draftTotalKobo(d)).toBe(525_000)
  })

  it('sends an entry price and an empty pool for paid challenges', () => {
    const d: CreateDraft = {
      ...base,
      rewards: { ...EMPTY_DRAFT.rewards, funding_type: 'entry_funded', pool_naira: '5,000', entry_price_naira: '1,000' },
    }
    const input = toCreateInput(d)
    expect(input.funding_type).toBe('entry_funded')
    expect(input.entry_price).toBe(100_000)
    expect(input.reward_pool_amount).toBe(0)
    expect(draftTotalKobo(d)).toBe(0)
  })
})
