import type { Metadata } from 'next'
import { Inter, JetBrains_Mono } from 'next/font/google'
import { Providers } from '@/components/providers'
import './globals.css'

const inter = Inter({ variable: '--font-sans', subsets: ['latin'] })
const mono = JetBrains_Mono({ variable: '--font-jetbrains', subsets: ['latin'] })

export const metadata: Metadata = {
  title: { default: 'Quest', template: '%s · Quest' },
  description: 'Post cash-backed challenges. Win real money.',
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${mono.variable} antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
