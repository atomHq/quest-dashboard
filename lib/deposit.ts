import { walletApi } from '@/lib/api/endpoints'
import { readJSON, removeKey, writeJSON } from '@/lib/session-storage'

const KEY = 'quest:pending-deposit'

export interface PendingDeposit {
  idempotencyKey: string
  amount: number
  /** wallet.available when the user left for Paystack, to detect the credit on return. */
  startAvailable: number
  purpose: 'wallet' | 'challenge' | 'join'
  /** Where to send the user once the credit lands (e.g. back to the paid challenge they were joining). */
  returnTo?: string
  reference?: string
  createdAt: number
}

/** Paystack won't take tiny charges; round the shortfall up to whole naira with a ₦100 floor. */
export const MIN_TOPUP_KOBO = 10_000
export function topUpAmount(shortfallKobo: number) {
  return Math.max(Math.ceil(shortfallKobo / 100) * 100, MIN_TOPUP_KOBO)
}

export function getPendingDeposit() {
  return readJSON<PendingDeposit>(KEY)
}

export function clearPendingDeposit() {
  removeKey(KEY)
}

/**
 * Starts a Paystack top-up and navigates away. The idempotency key is reused when the same
 * amount is retried (double clicks, flaky network), so the backend never creates two payments.
 */
export async function startDeposit(opts: {
  amount: number
  startAvailable: number
  purpose: PendingDeposit['purpose']
  returnTo?: string
  idempotencyKey?: string
}) {
  const existing = getPendingDeposit()
  const idempotencyKey =
    opts.idempotencyKey ??
    (existing && existing.amount === opts.amount && existing.purpose === opts.purpose && !existing.reference
      ? existing.idempotencyKey
      : crypto.randomUUID())

  const pending: PendingDeposit = {
    idempotencyKey,
    amount: opts.amount,
    startAvailable: opts.startAvailable,
    purpose: opts.purpose,
    returnTo: opts.returnTo,
    createdAt: Date.now(),
  }
  writeJSON(KEY, pending)

  const res = await walletApi.deposit(opts.amount, idempotencyKey)
  writeJSON(KEY, { ...pending, reference: res.reference })
  window.location.assign(res.authorization_url)
}
