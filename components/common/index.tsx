'use client'

import Link from 'next/link'
import { AlertTriangle, AudioLines, FileText, ImageIcon, Video, type LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import type { ChallengeStatus, SubmissionType } from '@/lib/api/types'
import { errorMessage } from '@/lib/api/errors'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

export function Logo({ className }: { className?: string }) {
  return (
    <Link href="/" className={cn('flex items-center gap-2 font-semibold tracking-tight', className)}>
      <span className="grid size-7 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
        Q
      </span>
      <span className="text-lg">Quest</span>
    </Link>
  )
}

export function Money({ kobo, className }: { kobo: number; className?: string }) {
  return <span className={cn('money text-primary', className)}>{formatNaira(kobo)}</span>
}

export function InitialsAvatar({
  name,
  src,
  className,
}: {
  name: string
  src?: string | null
  className?: string
}) {
  const initials = name
    .replace(/[_\-.]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
  return (
    <span
      className={cn(
        'relative inline-grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-primary/30 to-primary/5 text-xs font-semibold text-primary ring-1 ring-border',
        className,
      )}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={name} className="absolute inset-0 size-full object-cover" />
      ) : (
        initials || '?'
      )}
    </span>
  )
}

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon
  title: string
  description?: string
  action?: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-card/40 px-6 py-14 text-center',
        className,
      )}
    >
      <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
        <Icon className="size-5" />
      </span>
      <div className="space-y-1">
        <p className="font-medium">{title}</p>
        {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
      </div>
      {action}
    </div>
  )
}

export function ErrorState({ error, onRetry, className }: { error: unknown; onRetry?: () => void; className?: string }) {
  return (
    <div
      className={cn(
        'flex flex-col items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 px-6 py-10 text-center',
        className,
      )}
    >
      <AlertTriangle className="size-5 text-destructive" />
      <p className="text-sm text-muted-foreground">{errorMessage(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  )
}

export const SUBMISSION_ICON: Record<SubmissionType, LucideIcon> = {
  video: Video,
  audio: AudioLines,
  image: ImageIcon,
  written: FileText,
}

export function SubmissionTypeIcon({ type, className }: { type: SubmissionType; className?: string }) {
  const Icon = SUBMISSION_ICON[type]
  return <Icon className={cn('size-4', className)} aria-label={type} />
}

const STATUS_STYLE: Record<ChallengeStatus, string> = {
  draft: 'bg-muted text-muted-foreground',
  active: 'bg-success/15 text-success',
  closed: 'bg-primary/15 text-primary',
  judging: 'bg-blue-500/15 text-blue-400',
  completed: 'bg-foreground/10 text-foreground',
  cancelled: 'bg-destructive/15 text-destructive',
}

export function StatusBadge({ status, className }: { status: ChallengeStatus; className?: string }) {
  return (
    <Badge className={cn('border-0 capitalize', STATUS_STYLE[status], className)}>
      {status === 'active' && <span className="size-1.5 animate-pulse rounded-full bg-success" />}
      {status}
    </Badge>
  )
}

export function FormError({ message }: { message?: string }) {
  if (!message) return null
  return (
    <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
      {message}
    </p>
  )
}

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: React.ReactNode
  description?: React.ReactNode
  actions?: React.ReactNode
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions}
    </div>
  )
}
