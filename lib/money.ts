const nairaFormatter = new Intl.NumberFormat('en-NG', {
  style: 'currency',
  currency: 'NGN',
  maximumFractionDigits: 0,
})

/** Formats a KOBO integer as naira, e.g. 500000 → "₦5,000". */
export function formatNaira(kobo: number): string {
  return nairaFormatter.format(kobo / 100)
}

/** Converts a user-typed naira amount to KOBO. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100)
}

/** Parses user-typed naira ("50,000", "1500.50"); NaN when not a number. */
export function parseNaira(v: unknown): number {
  if (typeof v === 'number') return v
  if (typeof v !== 'string') return NaN
  const t = v.replace(/[,\s₦]/g, '')
  return t === '' ? NaN : Number(t)
}

export const PLATFORM_FEE_RATE = 0.05
export const MIN_PLATFORM_FEE_KOBO = 50

/** Mirrors the backend fee calculation exactly. */
export function computeFee(poolKobo: number): number {
  return Math.max(Math.floor(poolKobo * PLATFORM_FEE_RATE), MIN_PLATFORM_FEE_KOBO)
}

export function computeTotalCharge(poolKobo: number): number {
  return poolKobo + computeFee(poolKobo)
}

export function tierAmount(poolKobo: number, percentage: number): number {
  return Math.floor((poolKobo * percentage) / 100)
}
