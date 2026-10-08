'use client'

import { motion } from 'framer-motion'
import { CheckCircle2, XCircle } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export function AuthCard({
  title,
  description,
  children,
  footer,
}: {
  title: string
  description?: React.ReactNode
  children: React.ReactNode
  footer?: React.ReactNode
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{title}</CardTitle>
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
        <CardContent>{children}</CardContent>
      </Card>
      {footer && <div className="mt-4 text-center text-sm text-muted-foreground">{footer}</div>}
    </motion.div>
  )
}

export function ResultState({
  ok,
  title,
  description,
  children,
}: {
  ok: boolean
  title: string
  description?: React.ReactNode
  children?: React.ReactNode
}) {
  const Icon = ok ? CheckCircle2 : XCircle
  return (
    <div className="flex flex-col items-center gap-3 py-4 text-center">
      <motion.span
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 18 }}
      >
        <Icon className={ok ? 'size-12 text-success' : 'size-12 text-destructive'} />
      </motion.span>
      <p className="text-lg font-medium">{title}</p>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}
      {children}
    </div>
  )
}
