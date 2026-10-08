import type { SubmissionType } from '@/lib/api/types'

/** Shared by the feed filter and Create Challenge so category strings match exactly. */
export const CATEGORIES = [
  'Comedy',
  'Dance',
  'Music',
  'Art',
  'Fitness',
  'Food',
  'Education',
  'Gaming',
  'Other',
] as const

const MB = 1024 * 1024

export const MEDIA_RULES: Record<Exclude<SubmissionType, 'written'>, { types: string[]; maxBytes: number; label: string }> = {
  video: { types: ['video/mp4', 'video/quicktime', 'video/webm'], maxBytes: 250 * MB, label: 'MP4, MOV or WebM up to 250 MB' },
  image: { types: ['image/jpeg', 'image/png', 'image/webp'], maxBytes: 20 * MB, label: 'JPEG, PNG or WebP up to 20 MB' },
  audio: { types: ['audio/mpeg', 'audio/mp4', 'audio/wav', 'audio/webm'], maxBytes: 100 * MB, label: 'MP3, M4A, WAV or WebM up to 100 MB' },
}

export const AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export type AvatarContentType = (typeof AVATAR_TYPES)[number]

/** Returns an error message, or null when the file is acceptable. */
export function validateMediaFile(type: SubmissionType, file: File): string | null {
  if (type === 'written') return null
  const rule = MEDIA_RULES[type]
  if (!rule.types.includes(file.type)) return `Unsupported file type. Allowed: ${rule.label}.`
  if (file.size > rule.maxBytes) return `File is too large. Allowed: ${rule.label}.`
  return null
}

export const SUBMISSION_TYPE_LABEL: Record<SubmissionType, string> = {
  video: 'Video',
  audio: 'Audio',
  image: 'Image',
  written: 'Written',
}

export const DEFAULT_PER_PAGE = 20
