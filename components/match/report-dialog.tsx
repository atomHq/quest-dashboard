'use client'

import { useMemo } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Loader2, Trophy } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { reportSchema, type ReportValues } from '@/lib/schemas'
import { matchesApi } from '@/lib/api/endpoints'
import { errorMessage } from '@/lib/api/errors'
import { formatNaira } from '@/lib/money'
import type { MatchPlayer, MatchView } from '@/lib/api/types'
import { qk } from '@/hooks/queries'
import { Field } from '@/components/common/field'
import { FormError, InitialsAvatar } from '@/components/common'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'

function WinnerOption({ player, label, active, onSelect }: { player: MatchPlayer; label: string; active: boolean; onSelect: () => void }) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={active}
      onClick={onSelect}
      className={cn(
        'flex flex-col items-center gap-2 rounded-lg border bg-background/50 p-4 text-sm transition-colors hover:border-foreground/30',
        active && 'border-primary bg-primary/5',
      )}
    >
      <InitialsAvatar name={player.username} src={player.avatar_url} className="size-10" />
      <span className="font-medium">{label}</span>
      {active && <Trophy className="size-4 text-primary" />}
    </button>
  )
}

/** A player reports who won. Naming the opponent concedes and pays them straight away. */
export function ReportDialog({ match: m, open, onOpenChange }: { match: MatchView; open: boolean; onOpenChange: (o: boolean) => void }) {
  const queryClient = useQueryClient()
  const bestOf = m.head_to_head.best_of
  const schema = useMemo(() => reportSchema(bestOf), [bestOf])
  const form = useForm<ReportValues>({
    resolver: zodResolver(schema),
    defaultValues: { winner: undefined as unknown as ReportValues['winner'], creator_score: '', opponent_score: '' },
  })
  const { errors } = form.formState
  const winner = useWatch({ control: form.control, name: 'winner' })

  const iAmCreator = m.my_role === 'creator'
  const me = iAmCreator ? m.creator : m.opponent
  const them = iAmCreator ? m.opponent : m.creator
  const myRole = iAmCreator ? 'creator' : 'opponent'
  const conceding = winner != null && winner !== myRole
  const themReported = m.reports.find((r) => r.reporter_id === them.id)

  const report = useMutation({
    mutationFn: (v: ReportValues) =>
      matchesApi.report(m.challenge.id, {
        winner_id: v.winner === 'creator' ? m.creator.id : m.opponent.id,
        creator_score: v.creator_score === '' ? null : Number(v.creator_score),
        opponent_score: v.opponent_score === '' ? null : Number(v.opponent_score),
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(qk.match(m.challenge.id), updated)
      queryClient.invalidateQueries({ queryKey: qk.matches })
      queryClient.invalidateQueries({ queryKey: qk.wallet })
      const s = updated.head_to_head.state
      toast.success(
        s === 'settling' ? 'Result confirmed — paying the winner.' : s === 'disputed' ? 'Results disagree — an admin will review.' : 'Result reported.',
      )
      onOpenChange(false)
    },
    onError: (err) => form.setError('root.server', { type: 'server', message: errorMessage(err) }),
  })

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Report the result</DialogTitle>
          <DialogDescription>
            {themReported
              ? `@${them.username} has already reported. If you agree, the winner is paid straight away; if not, an admin reviews it.`
              : `If @${them.username} doesn't report by the deadline, your result stands.`}
          </DialogDescription>
        </DialogHeader>

        <form id="report-form" onSubmit={form.handleSubmit((v) => report.mutate(v))} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <div className="grid gap-1.5">
            <p className="text-sm font-medium">Who won?</p>
            <Controller
              control={form.control}
              name="winner"
              render={({ field }) => (
                <div role="radiogroup" className="grid grid-cols-2 gap-2">
                  <WinnerOption player={me} label="I won" active={field.value === myRole} onSelect={() => field.onChange(myRole)} />
                  <WinnerOption
                    player={them}
                    label={`@${them.username} won`}
                    active={field.value != null && field.value !== myRole}
                    onSelect={() => field.onChange(iAmCreator ? 'opponent' : 'creator')}
                  />
                </div>
              )}
            />
            {errors.winner && <p className="text-xs text-destructive">{errors.winner.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label={`@${m.creator.username}`} optional={bestOf == null} error={errors.creator_score?.message}>
              {(p) => <Input {...p} inputMode="numeric" placeholder="Games won" {...form.register('creator_score')} />}
            </Field>
            <Field label={`@${m.opponent.username}`} optional={bestOf == null} error={errors.opponent_score?.message}>
              {(p) => <Input {...p} inputMode="numeric" placeholder="Games won" {...form.register('opponent_score')} />}
            </Field>
          </div>
          <p className="-mt-2 text-xs text-muted-foreground">
            {bestOf != null ? `Best of ${bestOf}: the winner takes ${(bestOf + 1) / 2} games. ` : ''}Scores are optional.
          </p>

          {conceding && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-sm">
              Conceding pays <span className="font-medium">@{them.username}</span>{' '}
              <span className="money font-medium text-primary">{formatNaira(m.stake_summary.winner_takes)}</span> straight away. This
              can&apos;t be undone.
            </p>
          )}
        </form>

        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button type="submit" form="report-form" disabled={report.isPending}>
            {report.isPending && <Loader2 className="animate-spin" />} {conceding ? 'Concede' : 'Submit result'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
