'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { authApi, sessionApi } from '@/lib/api/endpoints'
import { errorMessage, isApiError } from '@/lib/api/errors'
import { applyApiError } from '@/lib/form-errors'
import {
  forgotSchema,
  loginSchema,
  resetSchema,
  signupSchema,
  type LoginValues,
  type SignupValues,
} from '@/lib/schemas'
import { useSession } from '@/stores/session'
import { Field } from '@/components/common/field'
import { FormError } from '@/components/common'
import { Button, buttonVariants } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { AuthCard, ResultState } from './auth-card'
import type { z } from 'zod'

/** Only allow same-site relative redirects. */
function safeNext(next: string | null) {
  return next && next.startsWith('/') && !next.startsWith('//') ? next : '/'
}

/** Bounce signed-in users away from login/signup. */
function useRedirectIfAuthed() {
  const status = useSession((s) => s.status)
  const router = useRouter()
  const search = useSearchParams()
  useEffect(() => {
    if (status === 'authed') router.replace(safeNext(search.get('next')))
  }, [status, router, search])
}

function Submit({ pending, children }: { pending: boolean; children: React.ReactNode }) {
  return (
    <Button type="submit" className="h-10 w-full" disabled={pending}>
      {pending && <Loader2 className="animate-spin" />}
      {children}
    </Button>
  )
}

// ---------------------------------------------------------------------------

export function LoginForm() {
  useRedirectIfAuthed()
  const router = useRouter()
  const search = useSearchParams()
  const form = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async (values) => {
    try {
      const session = await sessionApi.login(values)
      useSession.getState().setSession(session)
      router.replace(safeNext(search.get('next')))
    } catch (err) {
      applyApiError(err, form.setError, ['email', 'password'])
    }
  })

  return (
    <AuthCard
      title="Welcome back"
      description="Log in to join challenges and track your winnings."
      footer={
        <>
          New to Quest?{' '}
          <Link href="/signup" className="text-primary hover:underline">
            Create an account
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormError message={errors.root?.server?.message} />
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <Field label="Password" error={errors.password?.message}>
          {(p) => <Input {...p} type="password" autoComplete="current-password" {...form.register('password')} />}
        </Field>
        <div className="-mt-2 text-right">
          <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-foreground">
            Forgot password?
          </Link>
        </div>
        <Submit pending={isSubmitting}>Log in</Submit>
      </form>
    </AuthCard>
  )
}

// ---------------------------------------------------------------------------

export function SignupForm() {
  useRedirectIfAuthed()
  const router = useRouter()
  const search = useSearchParams()
  const form = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { username: '', email: '', password: '', confirm_password: '', first_name: '', last_name: '' },
  })
  const { errors, isSubmitting } = form.formState
  const username = form.register('username')

  const onSubmit = form.handleSubmit(async ({ username, email, password, first_name, last_name }) => {
    const rest = { username, email, password }
    try {
      const session = await sessionApi.signup({
        ...rest,
        username: rest.username.toLowerCase(),
        ...(first_name ? { first_name } : {}),
        ...(last_name ? { last_name } : {}),
      })
      useSession.getState().setSession(session)
      toast.success('Account created — check your inbox to verify your email.')
      router.replace(safeNext(search.get('next')))
    } catch (err) {
      applyApiError(err, form.setError, ['username', 'email', 'password', 'first_name', 'last_name'])
    }
  })

  return (
    <AuthCard
      title="Create your account"
      description="Post challenges, compete, and earn real money."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">
            Log in
          </Link>
        </>
      }
    >
      <form onSubmit={onSubmit} className="grid gap-4" noValidate>
        <FormError message={errors.root?.server?.message} />
        <Field label="Username" error={errors.username?.message} hint="Letters, numbers and underscores.">
          {(p) => (
            <div className="relative">
              <span className="pointer-events-none absolute top-1/2 left-2.5 -translate-y-1/2 text-sm text-muted-foreground">
                @
              </span>
              <Input
                {...p}
                autoComplete="username"
                className="pl-6"
                {...username}
                onChange={(e) => {
                  e.target.value = e.target.value.toLowerCase()
                  username.onChange(e)
                }}
              />
            </div>
          )}
        </Field>
        <Field label="Email" error={errors.email?.message}>
          {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" optional error={errors.first_name?.message}>
            {(p) => <Input {...p} autoComplete="given-name" {...form.register('first_name')} />}
          </Field>
          <Field label="Last name" optional error={errors.last_name?.message}>
            {(p) => <Input {...p} autoComplete="family-name" {...form.register('last_name')} />}
          </Field>
        </div>
        <Field label="Password" error={errors.password?.message} hint="At least 8 characters.">
          {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('password')} />}
        </Field>
        <Field label="Confirm password" error={errors.confirm_password?.message}>
          {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('confirm_password')} />}
        </Field>
        <Submit pending={isSubmitting}>Create account</Submit>
      </form>
    </AuthCard>
  )
}

// ---------------------------------------------------------------------------

export function VerifyEmail() {
  const token = useSearchParams().get('token')
  const [state, setState] = useState<'pending' | 'ok' | 'error'>(token ? 'pending' : 'error')
  const [message, setMessage] = useState<string>('This verification link is missing its token.')
  const status = useSession((s) => s.status)
  const sent = useRef(false)

  useEffect(() => {
    if (!token || sent.current) return
    sent.current = true // StrictMode double-invokes effects; tokens are single-use.
    authApi
      .verifyEmail(token)
      .then(() => setState('ok'))
      .catch((err) => {
        setMessage(
          isApiError(err, 'INVALID_EMAIL_VERIFICATION_TOKEN')
            ? 'This link is invalid or has expired. Request a new one from your settings.'
            : errorMessage(err),
        )
        setState('error')
      })
  }, [token])

  return (
    <AuthCard title="Email verification">
      {state === 'pending' && (
        <div className="flex flex-col items-center gap-3 py-8 text-sm text-muted-foreground">
          <Loader2 className="size-8 animate-spin text-primary" />
          Verifying your email…
        </div>
      )}
      {state === 'ok' && (
        <ResultState ok title="Email verified" description="You're all set. Time to find a challenge.">
          <Link href={status === 'authed' ? '/' : '/login'} className={buttonVariants({ className: 'mt-2 w-full' })}>
            {status === 'authed' ? 'Explore challenges' : 'Log in'}
          </Link>
        </ResultState>
      )}
      {state === 'error' && (
        <ResultState ok={false} title="Link expired" description={message}>
          <Link href="/" className={buttonVariants({ variant: 'outline', className: 'mt-2 w-full' })}>
            Back to Quest
          </Link>
        </ResultState>
      )}
    </AuthCard>
  )
}

// ---------------------------------------------------------------------------

export function ForgotPasswordForm() {
  const [done, setDone] = useState(false)
  const form = useForm<z.infer<typeof forgotSchema>>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ email }) => {
    try {
      await authApi.forgotPassword(email)
      setDone(true)
    } catch (err) {
      // Never reveal whether an account exists — only surface rate limits / outages.
      if (isApiError(err) && (err.status === 429 || err.status === 0 || err.status >= 500)) {
        applyApiError(err, form.setError, [])
      } else setDone(true)
    }
  })

  return (
    <AuthCard
      title="Reset your password"
      description={done ? undefined : "Enter your email and we'll send you a reset link."}
      footer={
        <Link href="/login" className="text-primary hover:underline">
          Back to log in
        </Link>
      }
    >
      {done ? (
        <ResultState
          ok
          title="Check your inbox"
          description="If an account exists for that email, we've sent a link to reset your password."
        />
      ) : (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <Field label="Email" error={errors.email?.message}>
            {(p) => <Input {...p} type="email" autoComplete="email" {...form.register('email')} />}
          </Field>
          <Submit pending={isSubmitting}>Send reset link</Submit>
        </form>
      )}
    </AuthCard>
  )
}

// ---------------------------------------------------------------------------

export function ResetPasswordForm() {
  const token = useSearchParams().get('token')
  const [state, setState] = useState<'form' | 'ok' | 'invalid'>(token ? 'form' : 'invalid')
  const form = useForm<z.infer<typeof resetSchema>>({
    resolver: zodResolver(resetSchema),
    defaultValues: { new_password: '', confirm_password: '' },
  })
  const { errors, isSubmitting } = form.formState

  const onSubmit = form.handleSubmit(async ({ new_password }) => {
    try {
      await authApi.resetPassword(token!, new_password)
      setState('ok')
    } catch (err) {
      if (isApiError(err, 'INVALID_RESET_TOKEN')) setState('invalid')
      else applyApiError(err, form.setError, ['new_password'])
    }
  })

  return (
    <AuthCard title="Choose a new password">
      {state === 'ok' && (
        <ResultState ok title="Password updated" description="You can now log in with your new password.">
          <Link href="/login" className={buttonVariants({ className: 'mt-2 w-full' })}>
            Log in
          </Link>
        </ResultState>
      )}
      {state === 'invalid' && (
        <ResultState ok={false} title="Link expired" description="This reset link is invalid or has expired.">
          <Link href="/forgot-password" className={buttonVariants({ className: 'mt-2 w-full' })}>
            Request a new link
          </Link>
        </ResultState>
      )}
      {state === 'form' && (
        <form onSubmit={onSubmit} className="grid gap-4" noValidate>
          <FormError message={errors.root?.server?.message} />
          <Field label="New password" error={errors.new_password?.message} hint="At least 8 characters.">
            {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('new_password')} />}
          </Field>
          <Field label="Confirm password" error={errors.confirm_password?.message}>
            {(p) => <Input {...p} type="password" autoComplete="new-password" {...form.register('confirm_password')} />}
          </Field>
          <Submit pending={isSubmitting}>Update password</Submit>
        </form>
      )}
    </AuthCard>
  )
}
