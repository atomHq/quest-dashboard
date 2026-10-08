import { format, formatDistanceToNowStrict } from 'date-fns'

const MINUTE = 60_000
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR

function plural(n: number, unit: string) {
  return `${n} ${unit}${n === 1 ? '' : 's'}`
}

/** Compact remaining-time string ("2 days 4 hours"), or null once past. */
export function remaining(deadline: string | Date, now: number = Date.now()): string | null {
  const ms = new Date(deadline).getTime() - now
  if (ms <= 0) return null
  const d = Math.floor(ms / DAY)
  const h = Math.floor((ms % DAY) / HOUR)
  const m = Math.floor((ms % HOUR) / MINUTE)
  const s = Math.floor((ms % MINUTE) / 1000)
  if (d > 0) return h > 0 ? `${plural(d, 'day')} ${plural(h, 'hour')}` : plural(d, 'day')
  if (h > 0) return m > 0 ? `${plural(h, 'hour')} ${plural(m, 'min')}` : plural(h, 'hour')
  if (m > 0) return plural(m, 'min')
  return plural(s, 'sec')
}

/** "closes in 2 days 4 hours" or "Closed". */
export function formatDeadline(deadline: string | Date, now: number = Date.now()): string {
  const r = remaining(deadline, now)
  return r ? `closes in ${r}` : 'Closed'
}

export function formatDate(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy')
}

export function formatDateTime(iso: string): string {
  return format(new Date(iso), 'MMM d, yyyy · h:mm a')
}

export function timeAgo(iso: string): string {
  return `${formatDistanceToNowStrict(new Date(iso))} ago`
}
