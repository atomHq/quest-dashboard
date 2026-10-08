import { Suspense } from 'react'
import { ChallengeFeed } from '@/components/challenge/feed'

export default function FeedPage() {
  return (
    <Suspense>
      <ChallengeFeed />
    </Suspense>
  )
}
