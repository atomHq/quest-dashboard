import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { MatchesView } from '@/components/match/match-list'

export const metadata: Metadata = { title: 'Matches' }

export default function MatchesPage() {
  return (
    <Suspense>
      <RequireAuth>
        <MatchesView />
      </RequireAuth>
    </Suspense>
  )
}
