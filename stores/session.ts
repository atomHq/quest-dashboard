import { create } from 'zustand'
import type { ClientSession, Profile, WalletBalance } from '@/lib/api/types'

export type SessionStatus = 'loading' | 'authed' | 'anon'

interface SessionState {
  status: SessionStatus
  accessToken: string | null
  accessExpiresAt: string | null
  user: Profile | null
  /** Last known wallet balance, mirrored from the ['wallet'] query for instant top-bar paint. */
  wallet: WalletBalance | null

  setSession: (s: ClientSession) => void
  setUser: (u: Profile) => void
  setWallet: (w: WalletBalance) => void
  clear: () => void
}

export const useSession = create<SessionState>()((set) => ({
  status: 'loading',
  accessToken: null,
  accessExpiresAt: null,
  user: null,
  wallet: null,

  setSession: (s) =>
    set({ status: 'authed', accessToken: s.access_token, accessExpiresAt: s.access_expires_at, user: s.user }),
  setUser: (user) => set({ user }),
  setWallet: (wallet) => set({ wallet }),
  clear: () => set({ status: 'anon', accessToken: null, accessExpiresAt: null, user: null, wallet: null }),
}))
