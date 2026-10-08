import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { WalletView } from '@/components/wallet/wallet-view'

export const metadata: Metadata = { title: 'Wallet' }

export default function WalletPage() {
  return (
    <Suspense>
      <RequireAuth>
        <WalletView />
      </RequireAuth>
    </Suspense>
  )
}
