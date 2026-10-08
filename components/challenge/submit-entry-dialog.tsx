'use client'

import { useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { CheckCircle2, Loader2, UploadCloud, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { submissionsApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/errors'
import type { Challenge, Submission } from '@/lib/api/types'
import { MEDIA_RULES, validateMediaFile } from '@/lib/constants'
import { putFile } from '@/lib/upload'
import { qk } from '@/hooks/queries'
import { FormError, SubmissionTypeIcon } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'

type Phase = 'idle' | 'creating' | 'uploading' | 'confirming' | 'done'

function formatBytes(n: number) {
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`
  return `${(n / 1024 / 1024).toFixed(1)} MB`
}

export function SubmitEntryDialog({
  challenge,
  open,
  onOpenChange,
}: {
  challenge: Challenge
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const queryClient = useQueryClient()
  const type = challenge.submission_type
  const needsMedia = type !== 'written'
  const rule = needsMedia ? MEDIA_RULES[type] : null

  const [caption, setCaption] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [phase, setPhase] = useState<Phase>('idle')
  const [progress, setProgress] = useState(0)
  // Survives retries: if the submission row was created but media failed, don't create another.
  const submissionRef = useRef<Submission | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const busy = phase === 'creating' || phase === 'uploading' || phase === 'confirming'

  function reset() {
    setCaption('')
    setFile(null)
    setFileError(null)
    setError(null)
    setPhase('idle')
    setProgress(0)
    submissionRef.current = null
  }

  function pick(f: File | undefined) {
    if (!f) return
    const err = validateMediaFile(type, f)
    setFileError(err)
    setFile(err ? null : f)
  }

  async function submit() {
    setError(null)
    if (needsMedia && !file) return setFileError('Choose a file to upload.')
    if (!needsMedia && !caption.trim()) return setError('Write your entry before submitting.')
    try {
      let sub = submissionRef.current
      if (!sub) {
        setPhase('creating')
        sub = await submissionsApi.create(challenge.id, caption.trim() || undefined)
        submissionRef.current = sub
      }
      if (needsMedia && file) {
        setPhase('uploading')
        setProgress(0)
        const { upload_url, key } = await submissionsApi.uploadUrl(sub.id, file.type)
        await putFile(upload_url, file, setProgress)
        setPhase('confirming')
        await submissionsApi.confirmMedia(sub.id, key)
      }
      setPhase('done')
      queryClient.invalidateQueries({ queryKey: qk.joined })
      queryClient.invalidateQueries({ queryKey: qk.challenge(challenge.id) })
    } catch (err) {
      setPhase('idle')
      setError(errorMessage(err))
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (busy) return
        onOpenChange(o)
        if (!o) setTimeout(reset, 200)
      }}
    >
      <DialogContent className="sm:max-w-lg">
        {phase === 'done' ? (
          <div className="flex flex-col items-center gap-3 py-6 text-center">
            <motion.span initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }}>
              <CheckCircle2 className="size-14 text-success" />
            </motion.span>
            <DialogTitle className="text-lg">Entry submitted</DialogTitle>
            <DialogDescription>
              Your entry is <span className="text-foreground">pending review</span>. It&apos;ll appear in the public
              Submissions tab once it&apos;s approved.
            </DialogDescription>
            <Button className="mt-2" onClick={() => onOpenChange(false)}>
              Done
            </Button>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Submit your entry</DialogTitle>
              <DialogDescription>
                {needsMedia ? `Upload your ${type} and add an optional caption.` : 'Write your entry below.'} You can
                only submit once.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4">
              {error && <FormError message={error} />}

              {needsMedia && rule && (
                <div className="grid gap-1.5">
                  <Label>File</Label>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => inputRef.current?.click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault()
                      pick(e.dataTransfer.files[0])
                    }}
                    className={cn(
                      'flex flex-col items-center gap-2 rounded-xl border border-dashed bg-background/50 px-4 py-8 text-center transition-colors hover:border-primary/50',
                      fileError && 'border-destructive/60',
                    )}
                  >
                    {file ? (
                      <>
                        <SubmissionTypeIcon type={type} className="size-6 text-primary" />
                        <span className="max-w-full truncate text-sm font-medium">{file.name}</span>
                        <span className="text-xs text-muted-foreground">{formatBytes(file.size)}</span>
                      </>
                    ) : (
                      <>
                        <UploadCloud className="size-6 text-muted-foreground" />
                        <span className="text-sm">Click or drop a file</span>
                        <span className="text-xs text-muted-foreground">{rule.label}</span>
                      </>
                    )}
                  </button>
                  <input
                    ref={inputRef}
                    type="file"
                    className="hidden"
                    accept={rule.types.join(',')}
                    onChange={(e) => {
                      pick(e.target.files?.[0])
                      e.target.value = ''
                    }}
                  />
                  {fileError && <p className="text-xs text-destructive">{fileError}</p>}
                  {file && !busy && (
                    <button type="button" onClick={() => setFile(null)} className="flex w-fit items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                      <X className="size-3" /> Remove
                    </button>
                  )}
                </div>
              )}

              <div className="grid gap-1.5">
                <Label htmlFor="caption">{needsMedia ? 'Caption (optional)' : 'Your entry'}</Label>
                <Textarea
                  id="caption"
                  value={caption}
                  disabled={busy || !!submissionRef.current}
                  onChange={(e) => setCaption(e.target.value)}
                  rows={needsMedia ? 3 : 8}
                  placeholder={needsMedia ? 'Say something about your entry…' : 'Write your entry…'}
                />
              </div>

              {(phase === 'uploading' || phase === 'confirming') && (
                <div className="grid gap-1.5">
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>{phase === 'confirming' ? 'Finalising…' : 'Uploading…'}</span>
                    <span className="money">{progress}%</span>
                  </div>
                  <Progress value={progress} />
                </div>
              )}
            </div>

            <DialogFooter>
              <Button variant="outline" disabled={busy} onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={submit} disabled={busy}>
                {busy && <Loader2 className="animate-spin" />}
                {submissionRef.current ? 'Retry upload' : 'Submit entry'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  )
}
