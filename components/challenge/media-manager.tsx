'use client'

import { useRef, useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ImagePlus, Loader2, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { MEDIA_RULES } from '@/lib/constants'
import { challengesApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/errors'
import type { MediaType } from '@/lib/api/types'
import { putFile } from '@/lib/upload'
import { qk, useChallenge } from '@/hooks/queries'
import { FormError } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { MediaView } from './media-gallery'

export const MAX_CHALLENGE_MEDIA = 3

const ACCEPT = Object.values(MEDIA_RULES).flatMap((r) => r.types).join(',')

function kindOf(file: File): MediaType | null {
  for (const [kind, rule] of Object.entries(MEDIA_RULES)) if (rule.types.includes(file.type)) return kind as MediaType
  return null
}

/** Lets a challenge's creator attach up to three images, videos or audio clips, and remove them. */
export function MediaManager({ challengeId, title }: { challengeId: string; title: string }) {
  const queryClient = useQueryClient()
  const q = useChallenge(challengeId)
  const inputRef = useRef<HTMLInputElement>(null)
  const [progress, setProgress] = useState<number | null>(null)
  const [error, setError] = useState<string | null>(null)
  const media = [...(q.data?.media ?? [])].sort((a, b) => a.position - b.position)
  const full = media.length >= MAX_CHALLENGE_MEDIA

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.challenge(challengeId) })
    queryClient.invalidateQueries({ queryKey: qk.systemChallenges })
  }

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { upload_url, key } = await challengesApi.mediaUploadUrl(challengeId, file.type)
      setProgress(0)
      await putFile(upload_url, file, setProgress)
      return challengesApi.confirmMedia(challengeId, key)
    },
    onSuccess: () => {
      toast.success('Media added')
      refresh()
    },
    onError: (err) => setError(errorMessage(err)),
    onSettled: () => setProgress(null),
  })

  const remove = useMutation({
    mutationFn: (mediaId: string) => challengesApi.deleteMedia(challengeId, mediaId),
    onSuccess: () => {
      toast('Media removed')
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setError(null)
    const kind = kindOf(file)
    if (!kind) return setError('Choose a JPEG, PNG or WebP image, an MP4, MOV or WebM video, or an MP3, M4A, WAV or WebM audio clip.')
    if (file.size > MEDIA_RULES[kind].maxBytes) return setError(`That file is too large. ${MEDIA_RULES[kind].label}.`)
    upload.mutate(file)
  }

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium">Media</p>
          <p className="text-xs text-muted-foreground">
            Up to {MAX_CHALLENGE_MEDIA} images, videos or audio clips. The first one is the cover.
          </p>
        </div>
        <span className="money text-xs text-muted-foreground">
          {media.length}/{MAX_CHALLENGE_MEDIA}
        </span>
      </div>

      {q.isPending ? (
        <Skeleton className="h-28 w-full rounded-lg" />
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {media.map((m) => (
            <div key={m.id} className="group relative aspect-video overflow-hidden rounded-lg border bg-muted">
              <MediaView m={m} alt={title} />
              <Button
                type="button"
                variant="destructive"
                size="icon-sm"
                aria-label="Remove media"
                className="absolute top-1.5 right-1.5"
                disabled={remove.isPending}
                onClick={() => remove.mutate(m.id)}
              >
                {remove.isPending && remove.variables === m.id ? <Loader2 className="animate-spin" /> : <Trash2 />}
              </Button>
            </div>
          ))}
          {!full && (
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={upload.isPending}
              className="flex aspect-video flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-xs text-muted-foreground transition-colors hover:border-primary/50 hover:text-foreground disabled:opacity-60"
            >
              {upload.isPending ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              {upload.isPending ? 'Uploading…' : 'Add media'}
            </button>
          )}
        </div>
      )}
      {progress !== null && <Progress value={progress} />}
      {error && <FormError message={error} />}
      <input ref={inputRef} type="file" accept={ACCEPT} className="hidden" onChange={onPick} />
    </div>
  )
}
