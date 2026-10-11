'use client'

import { useSearchParams } from 'next/navigation'
import { ChallengeFeed } from '@/components/challenge/feed'
import { FeaturedChallenges } from './featured-challenges'

export function HomeView() {
  const category = useSearchParams().get('category') ?? undefined
  return (
    <div className="space-y-12">
      <FeaturedChallenges category={category} />
      <ChallengeFeed />
    </div>
  )
}
