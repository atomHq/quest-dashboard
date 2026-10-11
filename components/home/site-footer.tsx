import Link from 'next/link'
import { Mail, MapPin } from 'lucide-react'
import { FOOTER_LINKS, SITE } from '@/lib/site'
import { Logo } from '@/components/common'

// lucide-react dropped brand icons, so these are inline.
function XIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  )
}

function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden className={className}>
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.5" fill="currentColor" />
    </svg>
  )
}

function LinkedInIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden className={className}>
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.04-1.85-3.04-1.85 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
    </svg>
  )
}

const SOCIALS = [
  { href: SITE.social.x, label: 'X (Twitter)', icon: XIcon },
  { href: SITE.social.instagram, label: 'Instagram', icon: InstagramIcon },
  { href: SITE.social.linkedin, label: 'LinkedIn', icon: LinkedInIcon },
]

function Column({ title, links }: { title: string; links: readonly { href: string; label: string }[] }) {
  return (
    <div>
      <p className="mb-3 text-sm font-semibold">{title}</p>
      <ul className="grid gap-2 text-sm">
        {links.map((l) => (
          <li key={l.href + l.label}>
            <Link href={l.href} className="text-muted-foreground transition-colors hover:text-foreground">
              {l.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t bg-sidebar">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-12 sm:px-6 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm text-muted-foreground">{SITE.description}</p>
          <div className="flex items-center gap-2">
            {SOCIALS.map(({ href, label, icon: Icon }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={label}
                className="grid size-9 place-items-center rounded-full border text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground"
              >
                <Icon className="size-4" />
              </a>
            ))}
          </div>
        </div>
        <Column title="Quick links" links={FOOTER_LINKS.quick} />
        <Column title="Legal" links={FOOTER_LINKS.legal} />
        <div>
          <p className="mb-3 text-sm font-semibold">Contact</p>
          <ul className="grid gap-2 text-sm text-muted-foreground">
            <li>
              <a href={`mailto:${SITE.contact.email}`} className="flex items-center gap-2 hover:text-foreground">
                <Mail className="size-4" /> {SITE.contact.email}
              </a>
            </li>
            <li className="flex items-center gap-2">
              <MapPin className="size-4" /> {SITE.contact.address}
            </li>
          </ul>
        </div>
      </div>
      <div className="border-t">
        <div className="mx-auto max-w-7xl space-y-3 px-4 py-6 text-xs text-muted-foreground sm:px-6">
          <p>{SITE.disclaimer}</p>
          <p>
            © {new Date().getFullYear()} {SITE.name}. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}
