import { readJSON, removeKey, writeJSON } from '@/lib/session-storage'
import { computeTotalCharge, nairaToKobo, parseNaira } from '@/lib/money'
import type { CreateChallengeInput } from '@/lib/api/types'
import type { DetailsValues, RewardsInput, SettingsValues } from '@/lib/schemas'

const KEY = 'quest:create-draft'

export type Step = 1 | 2 | 3 | 4

export interface CreateDraft {
  step: Step
  details: Partial<DetailsValues>
  settings: Partial<SettingsValues>
  rewards: Partial<RewardsInput>
  /** Set while the user is away at Paystack topping up for this draft. */
  awaitingFunding?: { idempotencyKey: string; amount: number }
}

export const EMPTY_DRAFT: CreateDraft = {
  step: 1,
  details: { title: '', description: '', rules: '' },
  settings: {
    submission_type: 'video',
    challenge_type: 'public',
    winner_selection: 'creator',
    max_participants: '',
    deadline: '',
  },
  rewards: { pool_naira: '', tiers: [{ rank: 1, percentage: 100 }] },
}

export function loadDraft(): CreateDraft | null {
  return readJSON<CreateDraft>(KEY)
}

export function saveDraft(d: CreateDraft) {
  writeJSON(KEY, d)
}

export function clearDraft() {
  removeKey(KEY)
}

export function draftPoolKobo(d: Pick<CreateDraft, 'rewards'>) {
  const n = parseNaira(d.rewards.pool_naira)
  return Number.isFinite(n) && n > 0 ? nairaToKobo(n) : 0
}

export function draftTotalKobo(d: Pick<CreateDraft, 'rewards'>) {
  const pool = draftPoolKobo(d)
  return pool > 0 ? computeTotalCharge(pool) : 0
}

export function toCreateInput(d: CreateDraft): CreateChallengeInput {
  const { details: dt, settings: st, rewards: rw } = d
  const rules = (dt.rules ?? '').trim()
  const max = (st.max_participants ?? '').trim()
  return {
    title: (dt.title ?? '').trim(),
    description: dt.description ?? '',
    category: dt.category!,
    rules: rules === '' ? null : rules,
    challenge_type: st.challenge_type!,
    submission_type: st.submission_type!,
    winner_selection: st.winner_selection!,
    reward_pool_amount: draftPoolKobo(d),
    max_participants: max === '' ? null : Number(max),
    deadline: new Date(st.deadline!).toISOString(),
    reward_tiers: (rw.tiers ?? []).map((t) => ({ rank: Number(t.rank), percentage: Number(t.percentage) })),
  }
}
