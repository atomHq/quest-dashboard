import Link from 'next/link'
import { FileText } from 'lucide-react'
import { SITE } from '@/lib/site'
import { buttonVariants } from '@/components/ui/button'

/** Stand-in until the real policy text is supplied. */
export function LegalPlaceholder({ title }: { title: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 py-16 text-center">
      <span className="grid size-14 place-items-center rounded-full bg-muted text-muted-foreground">
        <FileText className="size-6" />
      </span>
      <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
      <p className="text-sm text-muted-foreground">
        We&apos;re finalising this document. Questions in the meantime? Email{' '}
        <a href={`mailto:${SITE.contact.email}`} className="text-primary underline">
          {SITE.contact.email}
        </a>
        .
      </p>
      <Link href="/" className={buttonVariants({ variant: 'outline' })}>
        Back to challenges
      </Link>
    </div>
  )
}
