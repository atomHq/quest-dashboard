// Public-facing business details used by the home header and footer.
// TODO: replace the placeholder contact details and social URLs with the real ones.

export const SITE = {
  name: 'Quest',
  tagline: 'Post cash-backed challenges. Win real money.',
  description:
    'Quest is where creators put real prizes behind challenges and anyone can compete. Every reward pool is held in escrow until winners are paid.',
  contact: {
    email: 'support@example.com',
    address: 'Lagos, Nigeria',
  },
  social: {
    x: 'https://x.com',
    instagram: 'https://instagram.com',
    linkedin: 'https://linkedin.com',
  },
  disclaimer:
    'Challenges with entry fees involve financial risk — only enter with money you can afford to lose. Reward pools are held in escrow and released to winners chosen under each challenge’s rules. Participation is restricted to individuals 18 years and older.',
} as const

export const FOOTER_LINKS = {
  quick: [
    { href: '/faq', label: 'FAQs' },
    { href: '/', label: 'Browse challenges' },
    { href: '/dashboard/challenges/new', label: 'Create a challenge' },
  ],
  legal: [
    { href: '/privacy', label: 'Privacy Policy' },
    { href: '/terms', label: 'Terms of Service' },
  ],
} as const
