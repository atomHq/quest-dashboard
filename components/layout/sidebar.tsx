'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, Compass, Settings, User, Wallet, Plus } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Logo } from '@/components/common'
import { buttonVariants } from '@/components/ui/button'
import { useSession } from '@/stores/session'

export function useNavItems() {
  const username = useSession((s) => s.user?.username)
  return [
    { href: '/', label: 'Feed', icon: Compass, match: (p: string) => p === '/' || p.startsWith('/challenges') },
    { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard, match: (p: string) => p.startsWith('/dashboard') },
    { href: '/wallet', label: 'Wallet', icon: Wallet, match: (p: string) => p.startsWith('/wallet') },
    {
      href: username ? `/u/${username}` : '/login',
      label: 'Profile',
      icon: User,
      match: (p: string) => !!username && p === `/u/${username}`,
    },
    { href: '/settings', label: 'Settings', icon: Settings, match: (p: string) => p.startsWith('/settings') },
  ]
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname()
  const items = useNavItems()
  return (
    <nav className="grid gap-1">
      {items.map(({ href, label, icon: Icon, match }) => {
        const active = match(pathname)
        return (
          <Link
            key={label}
            href={href}
            onClick={onNavigate}
            className={cn(
              'group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground',
              active && 'bg-accent text-foreground',
            )}
          >
            {active && <span className="absolute inset-y-2 left-0 w-0.5 rounded-full bg-primary" />}
            <Icon className={cn('size-4', active && 'text-primary')} />
            {label}
          </Link>
        )
      })}
    </nav>
  )
}

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col gap-6 border-r bg-sidebar px-3 py-5 lg:flex">
      <Logo className="px-3" />
      <Link href="/dashboard/challenges/new" className={cn(buttonVariants(), 'h-9 justify-start gap-2 px-3')}>
        <Plus className="size-4" /> New challenge
      </Link>
      <NavLinks />
      <div className="mt-auto rounded-xl border bg-card p-4 text-xs text-muted-foreground">
        <p className="font-medium text-foreground">Funds are escrowed</p>
        <p className="mt-1">Every reward pool is locked before a challenge goes live.</p>
      </div>
    </aside>
  )
}
