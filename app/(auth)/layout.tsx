import { Logo } from '@/components/common'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-80 w-[40rem] -translate-x-1/2 rounded-full bg-primary/10 blur-3xl"
      />
      <Logo className="relative mb-8" />
      <div className="relative w-full max-w-sm">{children}</div>
    </div>
  )
}
