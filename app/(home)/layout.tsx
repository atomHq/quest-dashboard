import { Suspense } from 'react'
import { SiteHeader } from '@/components/home/site-header'
import { SiteFooter } from '@/components/home/site-footer'

export default function HomeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      {/* The category nav reads the query string. */}
      <Suspense fallback={<div className="h-[7.5rem] border-b md:h-[6.75rem]" />}>
        <SiteHeader />
      </Suspense>
      <main className="mx-auto w-full max-w-7xl flex-1 px-4 py-6 sm:px-6 sm:py-8">{children}</main>
      <SiteFooter />
    </div>
  )
}
