'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, LogOut, Send, Settings2, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { challengesApi } from '@/lib/api/endpoints'
import { errorMessage, isApiError } from '@/lib/api/errors'
import type { Challenge } from '@/lib/api/types'
import { qk, useInvites, useJoined } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { Button, buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { SubmitEntryDialog } from './submit-entry-dialog'

function Disabled({ children }: { children: React.ReactNode }) {
  return (
    <Button className="h-11 w-full" disabled>
      {children}
    </Button>
  )
}

export function JoinActions({ challenge: c }: { challenge: Challenge }) {
  const status = useSession((s) => s.status)
  const userId = useSession((s) => s.user?.id)
  const pathname = usePathname()
  const queryClient = useQueryClient()
  const joined = useJoined()
  const isDirect = c.challenge_type === 'direct'
  const invites = useInvites(isDirect)
  const [submitOpen, setSubmitOpen] = useState(false)
  const [leaveOpen, setLeaveOpen] = useState(false)

  const membership = joined.data?.find((j) => j.id === c.id)
  const invite = invites.data?.find((i) => i.challenge_id === c.id && i.status === 'pending')

  const refresh = () => {
    queryClient.invalidateQueries({ queryKey: qk.joined })
    queryClient.invalidateQueries({ queryKey: qk.challenge(c.id) })
    queryClient.invalidateQueries({ queryKey: qk.participants(c.id) })
  }

  const join = useMutation({
    mutationFn: () => (invite ? challengesApi.acceptInvite(c.id, invite.id) : challengesApi.join(c.id)),
    onSuccess: () => {
      toast.success("You're in! Submit your entry before the deadline.")
      refresh()
      queryClient.invalidateQueries({ queryKey: qk.invites })
    },
    onError: (err) => {
      if (isApiError(err, 'ALREADY_JOINED')) return refresh()
      toast.error(errorMessage(err))
      if (isApiError(err, 'INVITE_EXPIRED') || isApiError(err, 'INVITE_NOT_PENDING'))
        queryClient.invalidateQueries({ queryKey: qk.invites })
    },
  })

  const decline = useMutation({
    mutationFn: () => challengesApi.declineInvite(c.id, invite!.id),
    onSuccess: () => {
      toast('Invite declined')
      queryClient.invalidateQueries({ queryKey: qk.invites })
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  const leave = useMutation({
    mutationFn: () => challengesApi.leave(c.id),
    onSuccess: () => {
      toast('You left the challenge')
      setLeaveOpen(false)
      refresh()
    },
    onError: (err) => toast.error(errorMessage(err)),
  })

  if (status === 'loading') return <Skeleton className="h-11 w-full" />

  if (status === 'anon')
    return (
      <Link href={`/login?next=${encodeURIComponent(pathname)}`} className={buttonVariants({ className: 'h-11 w-full' })}>
        Log in to join
      </Link>
    )

  if (c.creator_id === userId)
    return (
      <Link href={`/dashboard/challenges/${c.id}`} className={buttonVariants({ variant: 'outline', className: 'h-11 w-full' })}>
        <Settings2 /> Manage challenge
      </Link>
    )

  if (joined.isPending || (isDirect && invites.isPending)) return <Skeleton className="h-11 w-full" />

  const isMember = membership && membership.participant_status !== 'withdrawn'
  if (isMember) {
    const submitted = membership.participant_status === 'submitted'
    const canSubmit = c.status === 'active' && membership.participant_status === 'joined'
    return (
      <div className="grid gap-2">
        {submitted ? (
          <Disabled>Entry submitted</Disabled>
        ) : membership.participant_status === 'disqualified' ? (
          <Disabled>Disqualified</Disabled>
        ) : (
          <Button className="h-11 w-full" disabled={!canSubmit} onClick={() => setSubmitOpen(true)}>
            <Send /> Submit entry
          </Button>
        )}
        {c.status === 'active' && !submitted && (
          <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setLeaveOpen(true)}>
            <LogOut /> Leave challenge
          </Button>
        )}
        <SubmitEntryDialog challenge={c} open={submitOpen} onOpenChange={setSubmitOpen} />
        <Dialog open={leaveOpen} onOpenChange={setLeaveOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Leave this challenge?</DialogTitle>
              <DialogDescription>You can rejoin later while it&apos;s still active and has space.</DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose render={<Button variant="outline" />}>Stay</DialogClose>
              <Button variant="destructive" onClick={() => leave.mutate()} disabled={leave.isPending}>
                {leave.isPending && <Loader2 className="animate-spin" />} Leave
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    )
  }

  if (c.status !== 'active') return <Disabled>Not accepting entries</Disabled>
  if (c.max_participants != null && c.participants_count >= c.max_participants) return <Disabled>Challenge is full</Disabled>
  if (isDirect && !invite) return <Disabled>Invite only</Disabled>

  return (
    <div className="grid gap-2">
      <Button className="h-11 w-full" onClick={() => join.mutate()} disabled={join.isPending}>
        {join.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
        {invite ? 'Accept invite & join' : 'Join challenge'}
      </Button>
      {invite && (
        <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => decline.mutate()} disabled={decline.isPending}>
          Decline invite
        </Button>
      )}
    </div>
  )
}
