import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { CreateChallengeWizard } from '@/components/create/wizard'

export const metadata: Metadata = { title: 'New challenge' }

export default function NewChallengePage() {
  return (
    <Suspense>
      <RequireAuth>
        <CreateChallengeWizard />
      </RequireAuth>
    </Suspense>
  )
}
