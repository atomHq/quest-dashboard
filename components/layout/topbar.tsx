'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, motion } from 'framer-motion'
import { Bell, BellOff, LogOut, Menu, Plus, Settings, User, Wallet } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import { sessionApi } from '@/lib/api/endpoints'
import { useNotifications, useWallet } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { InitialsAvatar, Logo } from '@/components/common'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { NavLinks } from './sidebar'

function WalletPill() {
  const { data, isLoading } = useWallet()
  const cached = useSession((s) => s.wallet)
  const balance = data ?? cached
  return (
    <Link
      href="/wallet"
      className="flex h-9 items-center gap-2 rounded-full border bg-card px-3 text-sm transition-colors hover:border-primary/50"
    >
      <Wallet className="size-4 text-muted-foreground" />
      {balance ? (
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={balance.available}
            initial={{ y: 8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            className="money font-medium text-primary"
          >
            {formatNaira(balance.available)}
          </motion.span>
        </AnimatePresence>
      ) : isLoading ? (
        <Skeleton className="h-4 w-16" />
      ) : (
        <span className="money text-muted-foreground">—</span>
      )}
    </Link>
  )
}

function NotificationsDrawer() {
  const [open, setOpen] = useState(false)
  const { data, unread } = useNotifications()
  return (
    <>
      <Button variant="ghost" size="icon" className="relative" aria-label="Notifications" onClick={() => setOpen(true)}>
        <Bell className="size-4" />
        {unread > 0 && <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-primary" />}
      </Button>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full sm:max-w-sm">
          <SheetHeader>
            <SheetTitle>Notifications</SheetTitle>
            <SheetDescription>Updates about your challenges and payouts.</SheetDescription>
          </SheetHeader>
          {data.length === 0 ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 pb-20 text-center">
              <span className="grid size-12 place-items-center rounded-full bg-muted text-muted-foreground">
                <BellOff className="size-5" />
              </span>
              <p className="font-medium">You&apos;re all caught up</p>
              <p className="text-sm text-muted-foreground">New activity will show up here.</p>
            </div>
          ) : (
            <ul className="grid gap-1 px-4">
              {data.map((n) => (
                <li key={n.id} className={cn('rounded-lg p-3', !n.read && 'bg-accent')}>
                  <p className="text-sm font-medium">{n.title}</p>
                  <p className="text-xs text-muted-foreground">{n.body}</p>
                </li>
              ))}
            </ul>
          )}
        </SheetContent>
      </Sheet>
    </>
  )
}

function UserMenu() {
  const user = useSession((s) => s.user)
  const token = useSession((s) => s.accessToken)
  const router = useRouter()
  const queryClient = useQueryClient()
  if (!user) return null

  async function logout() {
    try {
      await sessionApi.logout(token)
    } catch {
      // Cookie is cleared server-side regardless; nothing useful to show.
    }
    useSession.getState().clear()
    queryClient.clear()
    toast.success('Signed out')
    router.replace('/login')
  }

  const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={<button className="rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring" />}
        aria-label="Account menu"
      >
        <InitialsAvatar name={name} src={user.avatar_url} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium text-foreground">{name}</p>
          <p className="truncate text-xs text-muted-foreground">@{user.username}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href={`/u/${user.username}`} />}>
          <User /> Profile
        </DropdownMenuItem>
        <DropdownMenuItem render={<Link href="/settings" />}>
          <Settings /> Settings
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" onClick={logout}>
          <LogOut /> Log out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export function Topbar() {
  const status = useSession((s) => s.status)
  const [navOpen, setNavOpen] = useState(false)
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button variant="ghost" size="icon" className="lg:hidden" aria-label="Open menu" onClick={() => setNavOpen(true)}>
        <Menu className="size-5" />
      </Button>
      <Logo className="lg:hidden" />
      <Sheet open={navOpen} onOpenChange={setNavOpen}>
        <SheetContent side="left" className="w-72 gap-6 p-4">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Logo className="px-3" />
          <Link
            href="/dashboard/challenges/new"
            onClick={() => setNavOpen(false)}
            className={cn(buttonVariants(), 'h-9 justify-start gap-2 px-3')}
          >
            <Plus className="size-4" /> New challenge
          </Link>
          <NavLinks onNavigate={() => setNavOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="ml-auto flex items-center gap-2">
        {status === 'loading' && <Skeleton className="h-9 w-40 rounded-full" />}
        {status === 'authed' && (
          <>
            <WalletPill />
            <NotificationsDrawer />
            <UserMenu />
          </>
        )}
        {status === 'anon' && (
          <>
            <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>
              Log in
            </Link>
            <Link href="/signup" className={buttonVariants()}>
              Sign up
            </Link>
          </>
        )}
      </div>
    </header>
  )
}
