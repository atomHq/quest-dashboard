'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowRight, BadgeCheck, ChevronLeft, ChevronRight, Clock, Gift, Play, Ticket, Users } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatNaira } from '@/lib/money'
import type { SystemChallenge } from '@/lib/system-challenges'
import { useSystemChallenges } from '@/hooks/queries'
import { SubmissionTypeIcon } from '@/components/common'
import { Badge } from '@/components/ui/badge'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Countdown, ParticipantsCount } from '@/components/challenge/challenge-card'

const AUTO_ADVANCE_MS = 7_000

function Media({ m, title }: { m: SystemChallenge['media']; title: string }) {
  if (m.type === 'video' && m.url)
    return (
      <video
        src={m.url}
        poster={m.poster ?? undefined}
        className="size-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        aria-label={title}
      />
    )
  const src = m.type === 'image' ? m.url : m.poster
  return (
    <div className="relative size-full">
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- media will come from the API's CDN
        <img src={src} alt={title} className="size-full object-cover" />
      ) : (
        <div className="size-full bg-gradient-to-br from-primary/20 to-background" />
      )}
      {m.type === 'video' && (
        <span className="absolute inset-0 grid place-items-center">
          <span className="grid size-14 place-items-center rounded-full bg-background/70 text-foreground backdrop-blur">
            <Play className="ml-0.5 size-6" />
          </span>
        </span>
      )}
    </div>
  )
}

function Stat({ icon: Icon, label, children }: { icon: React.ComponentType<{ className?: string }>; label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="size-3.5" /> {label}
      </p>
      <p className="mt-0.5 text-sm font-medium">{children}</p>
    </div>
  )
}

function Slide({ c }: { c: SystemChallenge }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] md:gap-6">
      <div className="relative aspect-video overflow-hidden rounded-xl border bg-muted">
        <Media m={c.media} title={c.title} />
        <Badge className="absolute top-3 left-3 gap-1 bg-background/80 text-foreground backdrop-blur">
          <SubmissionTypeIcon type={c.submission_type} className="size-3" />
          {c.media.type === 'video' ? 'Video' : 'Photo'} challenge
        </Badge>
      </div>

      <div className="flex min-w-0 flex-col gap-4">
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{c.category}</p>
          <h3 className="text-2xl leading-tight font-semibold tracking-tight text-balance">{c.title}</h3>
          <p className="line-clamp-3 text-sm text-muted-foreground">{c.summary}</p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Reward pool</p>
          <p className="money text-3xl font-semibold text-primary">{formatNaira(c.reward_pool_amount)}</p>
        </div>

        <div className="grid grid-cols-3 gap-3 border-y py-3 [&>*]:min-w-0">
          <Stat icon={c.entry_price ? Ticket : Gift} label="Entry">
            {c.entry_price ? <span className="money">{formatNaira(c.entry_price)}</span> : 'Free'}
          </Stat>
          <Stat icon={Users} label="Joined">
            <ParticipantsCount c={c} />
          </Stat>
          <Stat icon={Clock} label="Ends">
            <Countdown deadline={c.deadline} className="first-letter:uppercase" />
          </Stat>
        </div>

        <div className="mt-auto">
          {c.challenge_id ? (
            <Link href={`/challenges/${c.challenge_id}`} className={buttonVariants({ className: 'h-10 w-full sm:w-auto' })}>
              View challenge <ArrowRight />
            </Link>
          ) : (
            <Button className="h-10 w-full sm:w-auto" disabled>
              Opens soon
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}

function Carousel({ items }: { items: SystemChallenge[] }) {
  const [index, setIndex] = useState(0)
  const [paused, setPaused] = useState(false)
  const n = items.length
  const i = Math.min(index, n - 1)

  useEffect(() => {
    if (paused || n < 2) return
    const t = setInterval(() => setIndex((x) => (x + 1) % n), AUTO_ADVANCE_MS)
    return () => clearInterval(t)
  }, [paused, n])

  return (
    <div
      className="min-w-0 rounded-2xl border bg-card p-4 sm:p-6"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <BadgeCheck className="size-4 text-primary" /> Quest Originals
        </p>
        {n > 1 && (
          <div className="flex items-center gap-2 text-sm">
            <Button variant="outline" size="icon-sm" aria-label="Previous" onClick={() => setIndex((i - 1 + n) % n)}>
              <ChevronLeft />
            </Button>
            <span className="money min-w-12 text-center text-muted-foreground" aria-live="polite">
              {i + 1} of {n}
            </span>
            <Button variant="outline" size="icon-sm" aria-label="Next" onClick={() => setIndex((i + 1) % n)}>
              <ChevronRight />
            </Button>
          </div>
        )}
      </div>

      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={items[i].id}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <Slide c={items[i]} />
        </motion.div>
      </AnimatePresence>

      {n > 1 && (
        <div className="mt-5 flex justify-center gap-1.5">
          {items.map((it, k) => (
            <button
              key={it.id}
              type="button"
              aria-label={`Show ${it.title}`}
              aria-current={k === i}
              onClick={() => setIndex(k)}
              className={cn('h-1.5 rounded-full transition-all', k === i ? 'w-6 bg-primary' : 'w-1.5 bg-muted-foreground/30')}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function HowItWorks() {
  return (
    <div className="relative flex flex-col justify-between gap-6 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/20 via-primary/5 to-card p-6">
      <div className="pointer-events-none absolute -top-10 -right-10 size-40 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative space-y-2">
        <p className="text-xl font-semibold tracking-tight">New to Quest?</p>
        <p className="text-sm text-muted-foreground">
          Join challenges for free or with a small entry, post your best entry, and win from a prize pool that&apos;s locked
          in escrow from day one.
        </p>
      </div>
      <ol className="relative grid gap-2 text-sm">
        {['Pick a challenge', 'Submit your entry', 'Get paid if you win'].map((s, k) => (
          <li key={s} className="flex items-center gap-2">
            <span className="money grid size-6 place-items-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
              {k + 1}
            </span>
            {s}
          </li>
        ))}
      </ol>
      <Link href="/faq" className={buttonVariants({ variant: 'outline', className: 'relative w-fit bg-background/60' })}>
        See how it works
      </Link>
    </div>
  )
}

/** Challenges run by the Quest team. Filtered by the active category; hidden when none match. */
export function FeaturedChallenges({ category }: { category?: string }) {
  const q = useSystemChallenges()
  const items = (q.data ?? []).filter((c) => !category || c.category === category)

  if (q.isError || (q.isSuccess && items.length === 0)) return null

  return (
    <section className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      {q.isPending ? <Skeleton className="h-[26rem] rounded-2xl" /> : <Carousel key={category ?? 'all'} items={items} />}
      <HowItWorks />
    </section>
  )
}
