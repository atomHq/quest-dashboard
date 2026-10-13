import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { MatchDetailView } from '@/components/match/match-view'

export const metadata: Metadata = { title: 'Match' }

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <RequireAuth>
        <MatchDetailView id={id} />
      </RequireAuth>
    </Suspense>
  )
}
