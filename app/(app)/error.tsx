'use client'

import { useEffect } from 'react'
import { AlertTriangle } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function AppError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error)
  }, [error])
  return (
    <div className="flex flex-col items-center gap-4 py-24 text-center">
      <AlertTriangle className="size-8 text-destructive" />
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Something went wrong</h1>
        <p className="text-sm text-muted-foreground">An unexpected error occurred while loading this page.</p>
      </div>
      <Button variant="outline" onClick={reset}>
        Try again
      </Button>
    </div>
  )
}
