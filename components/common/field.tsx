'use client'

import { useId } from 'react'
import { cn } from '@/lib/utils'
import { Label } from '@/components/ui/label'

/** Label + control + hint/error. The control receives id / aria-invalid via render prop. */
export function Field({
  label,
  hint,
  error,
  optional,
  className,
  children,
}: {
  label: React.ReactNode
  hint?: React.ReactNode
  error?: string
  optional?: boolean
  className?: string
  children: (props: { id: string; 'aria-invalid': boolean; 'aria-describedby'?: string }) => React.ReactNode
}) {
  const id = useId()
  const descId = `${id}-desc`
  return (
    <div className={cn('grid gap-1.5', className)}>
      <Label htmlFor={id} className="text-sm">
        {label}
        {optional && <span className="font-normal text-muted-foreground">(optional)</span>}
      </Label>
      {children({ id, 'aria-invalid': !!error, 'aria-describedby': error || hint ? descId : undefined })}
      {error ? (
        <p id={descId} className="text-xs text-destructive">
          {error}
        </p>
      ) : hint ? (
        <p id={descId} className="text-xs text-muted-foreground">
          {hint}
        </p>
      ) : null}
    </div>
  )
}
