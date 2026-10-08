import { z } from 'zod'
import { CATEGORIES } from '@/lib/constants'
import { parseNaira } from '@/lib/money'

// ---------------------------------------------------------------------------
// Auth
// ---------------------------------------------------------------------------

const password = z.string().min(8, 'Password must be at least 8 characters')

export const loginSchema = z.object({
  email: z.string().trim().email('Enter a valid email'),
  password: z.string().min(1, 'Enter your password'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const signupSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Username must be at least 3 characters')
      .max(50, 'Username must be at most 50 characters')
      .regex(/^[a-zA-Z0-9_]+$/, 'Only letters, numbers and underscores'),
    email: z.string().trim().email('Enter a valid email'),
    password,
    confirm_password: z.string(),
    first_name: z.string().trim().max(100).optional(),
    last_name: z.string().trim().max(100).optional(),
  })
  .refine((v) => v.password === v.confirm_password, {
    path: ['confirm_password'],
    message: "Passwords don't match",
  })
export type SignupValues = z.infer<typeof signupSchema>

export const forgotSchema = z.object({ email: z.string().trim().email('Enter a valid email') })

export const resetSchema = z
  .object({ new_password: password, confirm_password: z.string() })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ['confirm_password'],
    message: "Passwords don't match",
  })

export const changePasswordSchema = z
  .object({ current_password: z.string().min(1, 'Enter your current password'), new_password: password, confirm_password: z.string() })
  .refine((v) => v.new_password === v.confirm_password, {
    path: ['confirm_password'],
    message: "Passwords don't match",
  })
  .refine((v) => v.new_password !== v.current_password, {
    path: ['new_password'],
    message: 'New password must be different from your current one',
  })

// ---------------------------------------------------------------------------
// Profile
// ---------------------------------------------------------------------------

export const profileSchema = z.object({
  first_name: z.string().trim().max(100),
  last_name: z.string().trim().max(100),
  bio: z.string().trim().max(500, 'Bio must be at most 500 characters'),
})
export type ProfileValues = z.infer<typeof profileSchema>

// ---------------------------------------------------------------------------
// Challenges
// ---------------------------------------------------------------------------

const MIN_LEAD_MS = 60 * 60 * 1000

/** Strips tags so "<p></p>" from the rich text editor counts as empty. */
export function plainText(html: string) {
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').trim()
}

const deadline = z
  .string()
  .min(1, 'Pick a deadline')
  .refine((v) => !Number.isNaN(new Date(v).getTime()), 'Pick a valid date and time')
  .refine((v) => new Date(v).getTime() - Date.now() >= MIN_LEAD_MS, 'Deadline must be at least 1 hour from now')

/** Empty string ⇒ null; otherwise a positive integer. */
const maxParticipants = z
  .string()
  .trim()
  .refine((v) => v === '' || (/^\d+$/.test(v) && Number(v) > 0), 'Must be a positive whole number')

export const detailsSchema = z.object({
  title: z.string().trim().min(1, 'Give your challenge a title').max(200, 'Title is too long'),
  description: z.string().refine((v) => plainText(v).length > 0, 'Describe the challenge'),
  category: z.enum(CATEGORIES, { message: 'Pick a category' }),
  rules: z.string(),
})

export const settingsSchema = z.object({
  submission_type: z.enum(['video', 'audio', 'image', 'written']),
  challenge_type: z.enum(['public', 'direct']),
  winner_selection: z.enum(['creator', 'community', 'hybrid']),
  max_participants: maxParticipants,
  deadline,
})

export const tierSchema = z.object({
  rank: z.coerce.number<string | number>().int('Whole number').min(1, 'Min 1'),
  percentage: z.coerce.number<string | number>().int('Whole number').min(1, '1–100').max(100, '1–100'),
})

export const rewardsSchema = z
  .object({
    pool_naira: z
      .union([z.string(), z.number()])
      .transform((v) => parseNaira(v))
      .pipe(z.number({ message: 'Enter an amount' }).positive('Enter an amount greater than zero'))
      .refine((n) => Math.round(n * 100) >= 100, 'Minimum pool is ₦1'),
    tiers: z.array(tierSchema).min(1, 'Add at least one reward tier'),
  })
  .superRefine((v, ctx) => {
    const sum = v.tiers.reduce((a, t) => a + (Number(t.percentage) || 0), 0)
    if (sum !== 100) ctx.addIssue({ code: 'custom', path: ['tiers'], message: `Percentages must add up to 100% (currently ${sum}%)` })
    const seen = new Set<number>()
    v.tiers.forEach((t, i) => {
      if (seen.has(t.rank)) ctx.addIssue({ code: 'custom', path: ['tiers', i, 'rank'], message: 'Duplicate rank' })
      seen.add(t.rank)
    })
  })

export type DetailsValues = z.infer<typeof detailsSchema>
export type SettingsValues = z.infer<typeof settingsSchema>
export type RewardsInput = z.input<typeof rewardsSchema>
export type RewardsValues = z.output<typeof rewardsSchema>

export const editChallengeSchema = detailsSchema.extend({
  max_participants: maxParticipants,
  deadline,
})
export type EditChallengeValues = z.infer<typeof editChallengeSchema>

export const depositSchema = z.object({
  amount_naira: z
    .union([z.string(), z.number()])
    .transform((v) => parseNaira(v))
    .pipe(z.number({ message: 'Enter an amount' }).min(100, 'Minimum top-up is ₦100')
    .max(10_000_000, 'Maximum top-up is ₦10,000,000')),
})
