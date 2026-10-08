import { Suspense } from 'react'
import type { Metadata } from 'next'
import { RequireAuth } from '@/components/layout/require-auth'
import { DashboardView } from '@/components/dashboard/dashboard-view'

export const metadata: Metadata = { title: 'Dashboard' }

export default function DashboardPage() {
  return (
    <Suspense>
      <RequireAuth>
        <DashboardView />
      </RequireAuth>
    </Suspense>
  )
}
