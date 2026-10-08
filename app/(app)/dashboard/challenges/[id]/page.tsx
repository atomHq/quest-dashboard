import { Suspense } from 'react'
import { RequireAuth } from '@/components/layout/require-auth'
import { ManageChallengeView } from '@/components/dashboard/manage-challenge'

export default async function ManageChallengePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return (
    <Suspense>
      <RequireAuth>
        <ManageChallengeView id={id} />
      </RequireAuth>
    </Suspense>
  )
}
