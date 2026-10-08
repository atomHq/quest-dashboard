'use client'

import { useEffect, useMemo, useState } from 'react'
import DOMPurify from 'dompurify'
import { cn } from '@/lib/utils'

const looksLikeHtml = (s: string) => /<\/?[a-z][\s\S]*>/i.test(s)

/** Renders a description that may be HTML (from the editor) or plain text, sanitised. */
export function RichText({ value, className }: { value: string; className?: string }) {
  // DOMPurify needs the DOM, so the first (server + hydration) render is plain text.
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])
  const html = useMemo(() => {
    if (!mounted || !looksLikeHtml(value)) return null
    return DOMPurify.sanitize(value, { USE_PROFILES: { html: true } })
  }, [value, mounted])

  const base = cn(
    'text-sm leading-relaxed text-muted-foreground [&_a]:text-primary [&_a]:underline [&_h2]:mt-4 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_li]:my-0.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:text-foreground [&_ul]:list-disc [&_ul]:pl-5 [&_blockquote]:border-l-2 [&_blockquote]:pl-3',
    className,
  )
  if (html === null) {
    // Plain text (or pre-mount pass) — strip tags and keep line breaks.
    return <div className={cn(base, 'whitespace-pre-line')}>{value.replace(/<[^>]*>/g, '')}</div>
  }
  return <div className={base} dangerouslySetInnerHTML={{ __html: html }} />
}
