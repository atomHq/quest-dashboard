import { Suspense } from 'react'
import type { Metadata } from 'next'
import { SignupForm } from '@/components/auth/forms'

export const metadata: Metadata = { title: 'Sign up' }

export default function Page() {
  return (
    <Suspense>
      <SignupForm />
    </Suspense>
  )
}
