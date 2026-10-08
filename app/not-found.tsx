import Link from 'next/link'
import { Compass } from 'lucide-react'
import { Logo } from '@/components/common'
import { buttonVariants } from '@/components/ui/button'

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-6 px-4 text-center">
      <Logo />
      <p className="money text-7xl font-bold text-primary">404</p>
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">This page doesn&apos;t exist</h1>
        <p className="text-sm text-muted-foreground">The link may be broken, or the page may have moved.</p>
      </div>
      <Link href="/" className={buttonVariants()}>
        <Compass /> Browse challenges
      </Link>
    </div>
  )
}
