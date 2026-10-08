import { Suspense } from 'react'
import { PageHeader } from '@/components/common'
import { RequireAuth } from '@/components/layout/require-auth'
import { SettingsNav } from '@/components/settings/settings-forms'

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl">
      <PageHeader title="Settings" description="Manage your profile and account security." />
      <SettingsNav />
      <div className="pt-6">
        <Suspense>
          <RequireAuth>{children}</RequireAuth>
        </Suspense>
      </div>
    </div>
  )
}
