import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { DepositCallback } from '@/components/wallet/deposit-callback'

export const metadata: Metadata = { title: 'Confirming payment' }

export default function DepositCallbackPage() {
  return (
    <Suspense>
      <RequireAuth>
        <DepositCallback />
      </RequireAuth>
    </Suspense>
  )
}
