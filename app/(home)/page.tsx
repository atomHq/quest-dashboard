import { Suspense } from 'react'
import { HomeView } from '@/components/home/home-view'

export default function HomePage() {
  return (
    <Suspense>
      <HomeView />
    </Suspense>
  )
}
