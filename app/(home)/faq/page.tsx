import type { Metadata } from 'next'
import { ChevronDown } from 'lucide-react'
import { SITE } from '@/lib/site'

export const metadata: Metadata = { title: 'FAQs' }

const FAQS: { q: string; a: string }[] = [
  {
    q: 'How does Quest work?',
    a: 'Creators post a challenge with a prize pool and reward tiers. You join, submit your entry before the deadline, and the creator approves entries and picks the winners. Prizes are paid straight into winners’ wallets.',
  },
  {
    q: 'Is the prize money real?',
    a: 'Yes. For free-to-join challenges, the creator’s reward pool is moved into escrow before the challenge goes live. For paid challenges, every entry fee goes into escrow. Nobody can spend escrowed money until winners are paid or the challenge is cancelled.',
  },
  {
    q: 'What is the difference between free and paid challenges?',
    a: 'Free challenges are funded by the creator, so joining costs nothing. Paid challenges have an entry price taken from your wallet when you join; each entry (minus a small platform fee) grows the prize pool, so the pool gets bigger as more people join.',
  },
  {
    q: 'What fees does Quest charge?',
    a: 'A platform fee of 5% (minimum ₦0.50) applies when a creator funds a reward pool, and on each paid entry. The exact amounts are always shown before you confirm.',
  },
  {
    q: 'Can I leave a paid challenge and get my money back?',
    a: 'While the challenge is still active, you can leave and get your entry price back minus the platform fee. If the creator cancels the challenge, everyone is refunded in full.',
  },
  {
    q: 'How do I add money to my wallet?',
    a: 'Go to your wallet and top up with Paystack. If you try to join a paid challenge without enough balance, you can top up right from the join screen and come straight back.',
  },
  {
    q: 'What are Quest Originals?',
    a: 'Challenges run by the Quest team, featured at the top of the home page.',
  },
  {
    q: 'Who decides the winners?',
    a: 'The creator reviews entries, approves the ones that follow the rules, and assigns winners to each reward tier once the challenge closes. Only approved entries can win.',
  },
]

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl font-semibold tracking-tight">Frequently asked questions</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Can&apos;t find what you need? Email{' '}
        <a href={`mailto:${SITE.contact.email}`} className="text-primary underline">
          {SITE.contact.email}
        </a>
        .
      </p>
      <div className="mt-8 grid gap-3">
        {FAQS.map((f) => (
          <details key={f.q} className="group rounded-xl border bg-card px-5 py-4 open:border-primary/30">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 font-medium [&::-webkit-details-marker]:hidden">
              {f.q}
              <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
            </summary>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{f.a}</p>
          </details>
        ))}
      </div>
    </div>
  )
}
