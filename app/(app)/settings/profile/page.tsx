import type { Metadata } from 'next'
import { ProfileSettings } from '@/components/settings/settings-forms'

export const metadata: Metadata = { title: 'Profile settings' }

export default function ProfileSettingsPage() {
  return <ProfileSettings />
}
