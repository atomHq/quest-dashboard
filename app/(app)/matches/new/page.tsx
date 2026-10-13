import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { NewMatchForm } from '@/components/match/new-match-form'

export const metadata: Metadata = { title: 'New match' }

export default function NewMatchPage() {
  return (
    <Suspense>
      <RequireAuth>
        <NewMatchForm />
      </RequireAuth>
    </Suspense>
  )
}
