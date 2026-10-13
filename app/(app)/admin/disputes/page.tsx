import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { DisputesView } from '@/components/match/match-list'

export const metadata: Metadata = { title: 'Disputes' }

export default function DisputesPage() {
  return (
    <Suspense>
      <RequireAuth>
        <DisputesView />
      </RequireAuth>
    </Suspense>
  )
}
