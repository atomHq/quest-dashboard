import type { Metadata } from 'next'
import { LegalPlaceholder } from '@/components/home/legal-placeholder'

export const metadata: Metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return <LegalPlaceholder title="Terms of Service" />
}
