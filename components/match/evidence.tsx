'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { MEDIA_RULES } from '@/lib/constants'
import { matchesApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/errors'
import { formatDateTime } from '@/lib/time'
import type { MatchEvidence, MatchView } from '@/lib/api/types'
import { putFile } from '@/lib/upload'
import { qk } from '@/hooks/queries'
import { EmptyState, FormError } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'

export const MAX_EVIDENCE_PER_PLAYER = 3

const RULES = [MEDIA_RULES.image, MEDIA_RULES.video]
const ACCEPT = RULES.flatMap((r) => r.types).join(',')

/** Returns an error message, or null when the file is acceptable evidence. */
function checkFile(file: File): string | null {
  const rule = RULES.find((r) => r.types.includes(file.type))
  if (!rule) return 'Evidence must be an image (JPEG, PNG, WebP) or a video (MP4, MOV, WebM).'
  if (file.size > rule.maxBytes) return `File is too large. Allowed: ${rule.label}.`
  return null
}

function EvidenceTile({ e, by }: { e: MatchEvidence; by: string }) {
  return (
    <figure className="overflow-hidden rounded-lg border bg-background/50">
      <div className="aspect-video bg-black/40">
        {e.media_type === 'video' ? (
          <video src={e.url} controls playsInline preload="metadata" className="size-full object-contain" />
        ) : (
          <a href={e.url} target="_blank" rel="noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- evidence is served from the storage CDN */}
            <img src={e.url} alt={`Evidence from ${by}`} className="size-full object-contain" />
          </a>
        )}
      </div>
      <figcaption className="px-3 py-2 text-xs text-muted-foreground">
        {by} · {formatDateTime(e.created_at)}
      </figcaption>
    </figure>
  )
}

/** Both players' screenshots and clips; players add theirs while the match is in play or disputed. */
export function EvidenceSection({ match: m }: { match: MatchView }) {
  const queryClient = useQueryClient()
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)

  const id = m.challenge.id
  const player = m.my_role !== 'admin'
  const meId = m.my_role === 'opponent' ? m.opponent.id : m.creator.id
  const mine = m.evidence.filter((e) => e.uploader_id === meId).length
  const open = m.head_to_head.state === 'in_play' || m.head_to_head.state === 'disputed'
  const canAdd = player && open && mine < MAX_EVIDENCE_PER_PLAYER
  const nameOf = (uid: string) =>
    player && uid === meId ? 'You' : `@${uid === m.creator.id ? m.creator.username : m.opponent.username}`

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { upload_url, key } = await matchesApi.evidenceUploadUrl(id, file.type)
      setProgress(0)
      await putFile(upload_url, file, setProgress)
      return matchesApi.confirmEvidence(id, key)
    },
    onSuccess: () => {
      toast.success('Evidence added')
      queryClient.invalidateQueries({ queryKey: qk.match(id) })
    },
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setProgress(null),
  })

  function pick(file: File | undefined) {
    if (!file) return
    setError(null)
    const problem = checkFile(file)
    if (problem) return setError(problem)
    upload.mutate(file)
  }

  return (
    <section className="rounded-xl border bg-card">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h2 className="font-medium">Evidence</h2>
          <p className="text-xs text-muted-foreground">
            Screenshots or clips of the final score. Only the two of you and Quest admins can see them.
          </p>
        </div>
        {canAdd && (
          <>
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              className="hidden"
              onChange={(e) => {
                pick(e.target.files?.[0])
                e.target.value = ''
              }}
            />
            <Button variant="outline" size="sm" onClick={() => inputRef.current?.click()} disabled={upload.isPending}>
              {upload.isPending ? <Loader2 className="animate-spin" /> : <ImagePlus />} Add ({mine}/{MAX_EVIDENCE_PER_PLAYER})
            </Button>
          </>
        )}
      </div>
      <div className="grid gap-3 p-4">
        {progress !== null && <Progress value={progress} />}
        <FormError message={error ?? undefined} />
        {m.evidence.length === 0 ? (
          <EmptyState
            icon={ImagePlus}
            title="No evidence yet"
            description={open ? 'Optional — but if the results disagree, an admin decides from what is here.' : undefined}
            className="border-0 py-8"
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {m.evidence.map((e) => (
              <EvidenceTile key={e.id} e={e} by={nameOf(e.uploader_id)} />
            ))}
          </div>
        )}
      </div>
    </section>
  )
}
