import type { Metadata } from 'next'
import { ChangePasswordForm } from '@/components/settings/settings-forms'

export const metadata: Metadata = { title: 'Security' }

export default function SecuritySettingsPage() {
  return <ChangePasswordForm />
}
