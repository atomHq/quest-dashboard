import type { Metadata } from 'next'
import { LegalPlaceholder } from '@/components/home/legal-placeholder'

export const metadata: Metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return <LegalPlaceholder title="Privacy Policy" />
}
