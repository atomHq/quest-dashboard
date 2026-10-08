'use client'

import { useRef, useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useQueryClient } from '@tanstack/react-query'
import { BadgeCheck, Camera, Loader2, MailWarning } from 'lucide-react'
import { toast } from 'sonner'
import type { z } from 'zod'
import { cn } from '@/lib/utils'
import { authApi, usersApi } from '@/lib/api/endpoints'
import { errorMessage, isApiError } from '@/lib/api/errors'
import type { Profile } from '@/lib/api/types'
import { AVATAR_TYPES } from '@/lib/constants'
import { applyApiError } from '@/lib/form-errors'
import { changePasswordSchema, profileSchema, type ProfileValues } from '@/lib/schemas'
import { putFile } from '@/lib/upload'
import { qk, useMe } from '@/hooks/queries'
import { useSession } from '@/stores/session'
import { FormError, InitialsAvatar } from '@/components/common'
import { Field } from '@/components/common/field'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

const MAX_AVATAR_BYTES = 10 * 1024 * 1024

export function SettingsNav() {
  const pathname = usePathname()
  const items = [
    { href: '/settings/profile', label: 'Profile' },
    { href: '/settings/security', label: 'Security' },
  ]
  return (
    <nav className="flex gap-1 border-b">
      {items.map((i) => (
        <Link
          key={i.href}
          href={i.href}
          className={cn(
            '-mb-px border-b-2 border-transparent px-3 pb-2 text-sm text-muted-foreground transition-colors hover:text-foreground',
            pathname === i.href && 'border-primary text-foreground',
          )}
        >
          {i.label}
        </Link>
      ))}
    </nav>
  )
}

function useApplyProfile() {
  const queryClient = useQueryClient()
  return (p: Profile) => {
    useSession.getState().setUser(p)
    queryClient.setQueryData(qk.me, p)
    queryClient.setQueryData(qk.profile(p.username), p)
  }
}

// ---------------------------------------------------------------------------

function AvatarUploader({ profile }: { profile: Profile }) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [progress, setProgress] = useState(0)
  const [preview, setPreview] = useState<string | null>(null)
  const apply = useApplyProfile()
  const name = [profile.first_name, profile.last_name].filter(Boolean).join(' ') || profile.username

  async function upload(file: File) {
    if (!(AVATAR_TYPES as readonly string[]).includes(file.type)) return toast.error('Avatars must be JPEG, PNG or WebP.')
    if (file.size > MAX_AVATAR_BYTES) return toast.error('Avatar must be under 10 MB.')
    setBusy(true)
    setProgress(0)
    const local = URL.createObjectURL(file)
    setPreview(local)
    try {
      const { upload_url, key } = await usersApi.avatarUploadUrl(file.type)
      await putFile(upload_url, file, setProgress)
      let updated: Profile
      try {
        updated = await usersApi.confirmAvatar(key)
      } catch (err) {
        if (!isApiError(err, 'AVATAR_NOT_UPLOADED')) throw err
        // The object wasn't visible yet — retry the PUT once, then confirm again.
        await putFile(upload_url, file, setProgress)
        updated = await usersApi.confirmAvatar(key)
      }
      apply(updated)
      toast.success('Avatar updated')
    } catch (err) {
      toast.error(errorMessage(err))
    } finally {
      setBusy(false)
      setPreview(null)
      URL.revokeObjectURL(local)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="group relative rounded-full outline-none focus-visible:ring-2 focus-visible:ring-ring"
        aria-label="Change avatar"
      >
        <InitialsAvatar name={name} src={preview ?? profile.avatar_url} className="size-20 text-xl" />
        <span className="absolute inset-0 grid place-items-center rounded-full bg-black/60 opacity-0 transition-opacity group-hover:opacity-100 group-disabled:opacity-100">
          {busy ? <span className="money text-xs text-white">{progress}%</span> : <Camera className="size-5 text-white" />}
        </span>
      </button>
      <div className="text-sm">
        <p className="font-medium">Profile photo</p>
        <p className="text-xs text-muted-foreground">JPEG, PNG or WebP. Click the photo to change it.</p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={AVATAR_TYPES.join(',')}
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void upload(f)
        }}
      />
    </div>
  )
}

function ProfileForm({ profile }: { profile: Profile }) {
  const apply = useApplyProfile()
  const form = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: { first_name: profile.first_name ?? '', last_name: profile.last_name ?? '', bio: profile.bio ?? '' },
  })
  const { errors, isSubmitting, dirtyFields, isDirty } = form.formState

  const onSubmit = form.handleSubmit(async (v) => {
    // Send only what changed.
    const body: Partial<ProfileValues> = {}
    for (const k of ['first_name', 'last_name', 'bio'] as const) if (dirtyFields[k]) body[k] = v[k]
    try {
      const updated = await usersApi.updateMe(body)
      apply(updated)
      form.reset({ first_name: updated.first_name ?? '', last_name: updated.last_name ?? '', bio: updated.bio ?? '' })
      toast.success('Profile saved')
    } catch (err) {
      applyApiError(err, form.setError, ['first_name', 'last_name', 'bio'])
    }
  })

  return (
    <form onSubmit={onSubmit} className="grid gap-4" noValidate>
      <FormError message={errors.root?.server?.message} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={errors.first_name?.message}>
          {(p) => <Input {...p} autoComplete="given-name" {...form.register('first_name')} />}
        </Field>
        <Field label="Last name" error={errors.last_name?.message}>
          {(p) => <Input {...p} autoComplete="family-name" {...form.register('last_name')} />}
        </Field>
      </div>
      <Field label="Bio" error={errors.bio?.message} hint="Tell challengers a bit about yourself.">
        {(p) => <Textarea {...p} rows={4} {...form.register('bio')} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={!isDirty || isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Save changes
        </Button>
      </div>
    </form>
  )
}

export function ProfileSettings() {
  const { data: profile, isPending } = useMe()
  if (isPending || !profile)
    return (
      <div className="space-y-4">
        <Skeleton className="size-20 rounded-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    )
  const verified = profile.verification_status === 'verified'
  return (
    <div className="grid gap-6">
      <section className="grid gap-6 rounded-xl border bg-card p-5">
        <AvatarUploader profile={profile} />
        <ProfileForm profile={profile} />
      </section>
      <section className="flex items-center justify-between gap-4 rounded-xl border bg-card p-5 text-sm">
        <div>
          <p className="font-medium">Account</p>
          <p className="text-muted-foreground">
            @{profile.username} · {profile.email}
          </p>
        </div>
        <span className={cn('flex items-center gap-1.5 text-xs', verified ? 'text-success' : 'text-primary')}>
          {verified ? <BadgeCheck className="size-4" /> : <MailWarning className="size-4" />}
          {verified ? 'Email verified' : 'Email not verified'}
        </span>
      </section>
    </div>
  )
}

// ---------------------------------------------------------------------------

export function ChangePasswordForm() {
  const form = useForm<z.infer<typeof changePasswordSchema>>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { current_password: '', new_password: '', confirm_password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ current_password, new_password }) => {
    try {
      await authApi.changePassword({ current_password, new_password })
      form.reset()
      toast.success('Password changed')
    } catch (err) {
      // A wrong current password comes back as a handler 401 ("invalid email or password").
      if (isApiError(err) && err.status === 401) {
        form.setError('current_password', { message: 'Current password is incorrect' }, { shouldFocus: true })
      } else applyApiError(err, form.setError, ['current_password', 'new_password'])
    }
  })

  return (
    <form onSubmit={onSubmit} className="grid max-w-md gap-4 rounded-xl border bg-card p-5" noValidate>
      <div>
        <h2 className="font-medium">Change password</h2>
        <p className="text-xs text-muted-foreground">Use at least 8 characters.</p>
      </div>
      <FormError message={errors.root?.server?.message} />
      <Field label="Current password" error={errors.current_password?.message}>
        {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register('current_password')} />}
      </Field>
      <Field label="New password" error={errors.new_password?.message}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('new_password')} />}
      </Field>
      <Field label="Confirm new password" error={errors.confirm_password?.message}>
        {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('confirm_password')} />}
      </Field>
      <div className="flex justify-end">
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting && <Loader2 className="animate-spin" />} Update password
        </Button>
      </div>
    </form>
  )
}
