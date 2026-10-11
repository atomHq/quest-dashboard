'use client'

import { useState } from 'react'
import { Music, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ChallengeMedia } from '@/lib/api/types'

export function MediaView({ m, alt, className }: { m: ChallengeMedia; alt: string; className?: string }) {
  if (m.media_type === 'video')
    return <video src={m.url} controls playsInline preload="metadata" className={cn('size-full bg-black object-contain', className)} />
  if (m.media_type === 'audio')
    return (
      <div className={cn('flex size-full flex-col items-center justify-center gap-4 bg-gradient-to-br from-primary/20 to-background p-6', className)}>
        <Music className="size-10 text-primary" />
        <audio src={m.url} controls className="w-full max-w-md" aria-label={alt} />
      </div>
    )
  // eslint-disable-next-line @next/next/no-img-element -- media is served from the storage CDN
  return <img src={m.url} alt={alt} className={cn('size-full object-cover', className)} />
}

function Thumb({ m }: { m: ChallengeMedia }) {
  if (m.media_type === 'image')
    // eslint-disable-next-line @next/next/no-img-element -- media is served from the storage CDN
    return <img src={m.url} alt="" className="size-full object-cover" />
  const Icon = m.media_type === 'video' ? Play : Music
  return (
    <span className="grid size-full place-items-center bg-muted text-muted-foreground">
      <Icon className="size-5" />
    </span>
  )
}

/** The challenge's images, videos and audio: one large item with thumbnails to switch. */
export function MediaGallery({ media, title }: { media: ChallengeMedia[]; title: string }) {
  const items = [...media].sort((a, b) => a.position - b.position)
  const [activeId, setActiveId] = useState<string | null>(null)
  if (items.length === 0) return null
  const active = items.find((m) => m.id === activeId) ?? items[0]

  return (
    <div className="space-y-2">
      <div className="aspect-video overflow-hidden rounded-xl border bg-muted">
        <MediaView key={active.id} m={active} alt={title} />
      </div>
      {items.length > 1 && (
        <div className="flex gap-2">
          {items.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setActiveId(m.id)}
              aria-label={`Show media ${i + 1}`}
              aria-pressed={m.id === active.id}
              className={cn(
                'h-14 w-24 overflow-hidden rounded-lg border-2 transition-colors',
                m.id === active.id ? 'border-primary' : 'border-transparent opacity-70 hover:opacity-100',
              )}
            >
              <Thumb m={m} />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
