'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { LayoutDashboard, Loader2, Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CATEGORIES } from '@/lib/constants'
import { formatNaira } from '@/lib/money'
import { useSearchChallenges } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { Logo } from '@/components/common'
import { buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { NotificationsDrawer, UserMenu, WalletPill } from '@/components/layout/topbar'

function useDebounced<T>(value: T, ms: number) {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

function SearchBox({ className }: { className?: string }) {
  const router = useRouter()
  const [term, setTerm] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const boxRef = useRef<HTMLDivElement>(null)
  const debounced = useDebounced(term, 250)
  const q = useSearchChallenges(debounced)
  const results = debounced.trim().length >= 2 ? (q.data ?? []) : []
  const showPanel = open && term.trim().length >= 2

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (!boxRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [])

  function go(id: string) {
    setOpen(false)
    setTerm('')
    router.push(`/challenges/${id}`)
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Escape') return setOpen(false)
    if (!results.length) return
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((i) => (i + 1) % results.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((i) => (i - 1 + results.length) % results.length)
    } else if (e.key === 'Enter') {
      e.preventDefault()
      go(results[Math.min(active, results.length - 1)].id)
    }
  }

  return (
    <div ref={boxRef} className={cn('relative', className)}>
      <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        type="search"
        role="combobox"
        aria-expanded={showPanel}
        aria-controls="site-search-results"
        aria-label="Search challenges"
        placeholder="Search challenges…"
        value={term}
        onChange={(e) => {
          setTerm(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        className="h-10 rounded-full bg-card pr-9 pl-9 [&::-webkit-search-cancel-button]:hidden"
      />
      {term && (
        <button
          type="button"
          aria-label="Clear search"
          onClick={() => setTerm('')}
          className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground"
        >
          {q.isFetching ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
        </button>
      )}

      {showPanel && (
        <div
          id="site-search-results"
          role="listbox"
          className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-xl border bg-popover shadow-xl"
        >
          {q.isError ? (
            <p className="p-4 text-sm text-muted-foreground">Search is unavailable right now.</p>
          ) : results.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {q.isFetching || debounced !== term ? 'Searching…' : `No challenges match “${term.trim()}”.`}
            </p>
          ) : (
            <ul className="py-1">
              {results.map((c, i) => (
                <li key={c.id} role="option" aria-selected={i === active}>
                  <button
                    type="button"
                    onMouseEnter={() => setActive(i)}
                    onClick={() => go(c.id)}
                    className={cn('flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left', i === active && 'bg-accent')}
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium">{c.title}</span>
                      <span className="text-xs text-muted-foreground">{c.category}</span>
                    </span>
                    <span className="money shrink-0 text-sm text-primary">{formatNaira(c.reward_pool_amount)}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}

function AuthActions() {
  const status = useSession((s) => s.status)
  if (status === 'loading') return <Skeleton className="h-9 w-40 rounded-full" />
  if (status === 'authed')
    return (
      <>
        <Link href="/dashboard" className={buttonVariants({ variant: 'ghost', className: 'hidden sm:inline-flex' })}>
          <LayoutDashboard /> Dashboard
        </Link>
        <WalletPill />
        <NotificationsDrawer />
        <UserMenu />
      </>
    )
  return (
    <>
      <Link href="/login" className={buttonVariants({ variant: 'ghost' })}>
        Log in
      </Link>
      <Link href="/signup" className={buttonVariants()}>
        Sign up
      </Link>
    </>
  )
}

function CategoryNav() {
  const pathname = usePathname()
  const params = useSearchParams()
  const current = pathname === '/' ? params.get('category') : null

  const href = (category: string | null) => {
    const next = new URLSearchParams(pathname === '/' ? params : undefined)
    if (category) next.set('category', category)
    else next.delete('category')
    const qs = next.toString()
    return qs ? `/?${qs}` : '/'
  }

  const items: { label: string; value: string | null }[] = [
    { label: 'All', value: null },
    ...CATEGORIES.map((c) => ({ label: c, value: c })),
  ]

  return (
    <nav aria-label="Categories" className="-mb-px flex gap-6 overflow-x-auto [&::-webkit-scrollbar]:hidden">
      {items.map((it) => {
        const active = pathname === '/' && current === it.value
        return (
          <Link
            key={it.label}
            href={href(it.value)}
            scroll={false}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'shrink-0 border-b-2 py-3 text-sm transition-colors',
              active ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground',
            )}
          >
            {it.label}
          </Link>
        )
      })}
    </nav>
  )
}

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/85 backdrop-blur-md">
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="flex h-16 items-center gap-4">
          <Logo />
          <SearchBox className="hidden max-w-md flex-1 md:block" />
          <div className="ml-auto flex items-center gap-2">
            <AuthActions />
          </div>
        </div>
        <div className="pb-3 md:hidden">
          <SearchBox />
        </div>
        <CategoryNav />
      </div>
    </header>
  )
}
