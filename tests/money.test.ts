import { describe, expect, it } from 'vitest'
import { computeFee, computeTotalCharge, formatNaira, matchWinnerTakes, nairaToKobo, parseNaira, tierAmount } from '@/lib/money'

describe('money', () => {
  it('formats kobo as whole naira', () => {
    expect(formatNaira(500_000)).toBe('₦5,000')
    expect(formatNaira(0)).toBe('₦0')
  })

  it('converts naira to kobo with rounding', () => {
    expect(nairaToKobo(5000)).toBe(500_000)
    expect(nairaToKobo(19.99)).toBe(1999)
    expect(nairaToKobo(0.1 + 0.2)).toBe(30)
  })

  it('parses user-typed naira', () => {
    expect(parseNaira('50,000')).toBe(50_000)
    expect(parseNaira('₦ 1,500.50')).toBe(1500.5)
    expect(parseNaira('')).toBeNaN()
    expect(parseNaira('abc')).toBeNaN()
  })

  it('mirrors the backend fee: 5% floored, minimum 50 kobo', () => {
    expect(computeFee(500)).toBe(50) // 25 → min 50
    expect(computeFee(1_000)).toBe(50)
    expect(computeFee(1_019)).toBe(50) // 50.95 floored
    expect(computeFee(500_000)).toBe(25_000)
    expect(computeTotalCharge(500_000)).toBe(525_000)
  })

  it('floors tier amounts', () => {
    expect(tierAmount(500_000, 60)).toBe(300_000)
    expect(tierAmount(1_001, 33)).toBe(330)
  })
})

describe('matchWinnerTakes', () => {
  it('pays both stakes minus the fee on each, like the backend stake_summary', () => {
    // ₦5,000 each: ₦250 fee per stake → ₦9,500.
    expect(matchWinnerTakes(500_000)).toBe(950_000)
    // Minimum fee: a ₦5 stake loses 50 kobo each.
    expect(matchWinnerTakes(500)).toBe(900)
  })
})
